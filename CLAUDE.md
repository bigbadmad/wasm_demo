# Bootsharp C# WASM worker-pool demo

A demo of running a .NET/C# business-logic library inside a pool of Web
Workers, each hosting its own Bootsharp WASM runtime instance, to show
concurrency without blocking the main thread — plus a memory-aware pool
that avoids over-spawning workers.

## Layout

- `index.html` — the whole UI: controls, worker-card grid, event log, and
  the glue script that wires `WorkerPool` events to the DOM. No build step,
  no framework.
- `pool.js` — `WorkerPool` class. All the interesting logic lives here.
- `worker.js` — the module worker entry point. Boots Bootsharp once, then
  handles one `{ jobId, duration, askCount }` message per job by calling
  `Program.runJob`. Also implements the C# → JS imports `askUser` (blocks
  on `Atomics.wait`) and `reportProgress`.
- `answer-slot.js` — layout + read/write helpers for the per-worker
  `SharedArrayBuffer` that carries a user's answer back into a blocked
  worker. Shared by `worker.js` and `pool.js`.
- `serve.json` — COOP/COEP headers for `serve`. Required: without
  cross-origin isolation `SharedArrayBuffer` doesn't exist and the UI
  disables "Run batch".
- `cs/Program.cs`, `cs/WasmDemo.csproj` — the actual C# "business logic":
  `[Export] RunJob(jobId, durationMs, askCount)` plus sync
  `[Import] AskUser` / `ReportProgress`. Target is `net10.0` /
  `browser-wasm` via the `Bootsharp` NuGet package. Rebuilding needs the
  .NET 10 `wasm-tools` workload (`cd cs && dotnet publish -c Debug`).
- `cs/bin/bootsharp/**` — **generated output** from the Bootsharp build
  (dotnet runtime, JS interop glue, `index.mjs`, `runtime.mjs`, etc.). Don't
  hand-edit; it gets regenerated. `runtime.mjs`'s `getHeap()` is a
  documented part of Bootsharp's public surface (has its own `.d.mts`) even
  though it isn't re-exported through `index.mjs` — importing it directly
  from `cs/bin/bootsharp/runtime.mjs` is intentional, not a hack.
- `package.json` at repo root — `npm start` runs `serve . -l 8080`
  (static file server, no bundling).

## WorkerPool design (pool.js)

Constructor options, all with safe defaults so omitting the memory options
keeps prior behavior unchanged:
- `maxWorkers` (default 4) — hard cap on worker count.
- `memoryBudgetBytes` (default `Infinity`) — soft cap on total self-reported
  worker memory; blocks spawning a new worker if it would likely exceed it.
- `workerMemoryLimitBytes` (default `Infinity`) — per-worker ceiling; a
  worker reporting over this after finishing a job gets terminated and
  rebooted in the same slot instead of returned to idle.

Non-obvious invariants worth preserving if you touch `_dispatch()`:

1. **Workers spawn lazily, on demand** — not all up front at construction —
   because each one boots its own .NET runtime + business logic library and
   that costs real memory. A pool asked to do 2 jobs should only ever spawn
   2 workers, not `maxWorkers`.
2. **Growth trigger must be `queue.length > bootingCount`, not "no idle
   worker was found."** Assigning to idle workers and deciding whether to
   grow are separate concerns, both re-checked on every `_dispatch()` call.
   Two wrong versions were tried and rejected during development:
   - Gating growth on "no idle worker found *this call*" (old single-shot
     dispatch) means a lone worker that immediately re-absorbs the next
     queued job never gives growth a second look — under a memory budget,
     this gets the pool permanently stuck below what the budget would
     actually allow, once the initial data-free burst window closes.
   - Gating growth on "backlog > 0" alone over-provisions: a worker that's
     merely still *booting* (not idle yet, but about to be) looks
     indistinguishable from "we need more capacity," so the pool spawns
     workers it doesn't need.
   Comparing backlog against `bootingCount` (already-committed future
   capacity) fixes both.
3. **Memory budget checks wait for every existing worker to report real
   data before betting on one more fitting.** The very first worker is let
   through unconditionally (no data exists yet). This avoids a burst of
   synchronous job submissions spawning several workers on pure guesses
   before any of them has actually reported in.
4. **`memBytes` comes from `getHeap().buffer.byteLength`** (actual WASM
   linear memory size), not `performance.memory` — the latter is
   Chromium-only and non-standard; the former is a real number available in
   any worker.
5. **WASM linear memory only grows.** Once a worker's reported memory
   creeps over `workerMemoryLimitBytes`, the only way to reclaim it is
   `terminate()` + respawn — there's no in-place shrink.

Empirical baseline (measured during development with this exact demo's
`Program.cs`, on this build): a freshly booted worker self-reports **~32
MB**. Useful for picking test figures for the memory-budget/recycle inputs,
but re-measure rather than trust this if the C# lib, Bootsharp version, or
target framework changes.

## Synchronous C# → UI questions (askUser)

C# calls `AskUser` synchronously mid-job. The worker's event loop is frozen
for the whole `runJob` call, so **the answer can never arrive by
`postMessage`** — `onmessage` wouldn't run until C# returned, which it
can't without the answer. Instead:

1. Worker sets the slot's state word to `PENDING`, posts `{ type: 'ask' }`,
   then `Atomics.wait`s on that word.
2. Pool marks the worker `waiting` and emits `'ask'` with a request object
   carrying `answer(text)` / `cancel()`.
3. `answer` writes UTF-8 into the slot, flips state to `ANSWERED`,
   `Atomics.notify`s. `cancel` flips to `CANCELLED`, which makes `askUser`
   throw → exception unwinds through C# → worker posts `'failed'` → job
   rejects, worker goes back to idle (runtime is still healthy).

Gotchas found while building it:
- `TextEncoder.encodeInto` and `TextDecoder.decode` **refuse views over
  shared memory** in Chromium — copy through an ordinary buffer.
- `postMessage` *out* of a blocked worker works fine (it only enqueues);
  that's how `reportProgress` streams progress during a C# call.
- A `waiting` worker holds its pool slot and memory but no CPU. It's not
  `idle`, so `_dispatch()` correctly won't hand it work or count it as
  spare capacity.

## UI (index.html) reference

Inputs: `#jobCount`, `#minDur`, `#maxDur`, `#minAsks`, `#maxAsks`
(questions per job), `#maxWorkers`, `#memBudget` (MB, blank = off),
`#workerMemLimit` (MB, blank = off). Button: `#runBtn`. Pending questions
render as `form.prompt` in `#prompts` (text `input`, submit button,
`.cancel` button); `#promptsHead` shows the count. Badge states include
`waiting`.
Stats: `#spawnStat` ("spawned: X / cap"), `#queueStat`, `#doneStat`,
`#wallStat`. Worker cards (`.worker-card`, one per **spawned** worker —
they appear lazily, not pre-rendered) each have `.badge` (state),
`.job-info`, `.mem` ("mem: X.X MB"), `.fill` (progress bar). Event log is
`#log`.

## Running / testing

No automated test suite — this is a UI demo. To verify changes, actually
run it in a browser; see the `run-wasm-demo` project skill
(`.claude/skills/run-wasm-demo/`) for the exact setup, since `chromium-cli`
is not available in this environment and Playwright has to be bootstrapped
by hand into the scratchpad directory.
