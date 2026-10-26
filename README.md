# Bootsharp C# WASM - Web Worker Thread Pool

## Quick start

Requires only [Node.js](https://nodejs.org/) - the compiled WASM output is
committed, so the .NET SDK is **not** needed just to run this.

```sh
git clone <this repo>
cd wasm_demo
npm install
npm start
```

Open <http://localhost:8080>. See "Run" below for what to click.

You only need the [.NET 10 SDK](https://dotnet.microsoft.com/download) (with
the `wasm-tools` workload) if you want to change [`cs/Program.cs`](cs/Program.cs)
and rebuild - see "Build".

## What this app proves

A C# method compiled to WASM via [Bootsharp](https://bootsharp.com) can be
loaded, initialised, and called **entirely inside a dedicated Web Worker** -
synchronously, blocking only that worker's thread. Building on that, a small
JS-side pool manages **4 such workers as a fixed-size thread pool**: it
queues jobs beyond 4 concurrent and dispatches each one the instant a worker
frees up, the same way a server-side thread/worker pool would.

The pulsing heartbeat on the page is proof the main thread is never
touched: it keeps ticking throughout, even while all 4 workers are busy
running blocking WASM calls.

## How it's put together

```
cs/
  WasmDemo.csproj     .NET 10 browser-wasm project, Bootsharp package
  Program.cs          [Export] RunJob(...) + sync [Import] AskUser/ReportProgress
  bin/bootsharp/       Bootsharp-generated ES module (build output, see below)
worker.js              ES module Web Worker: boots Bootsharp once, then serves
                        one RunJob per incoming message; implements AskUser
pool.js                WorkerPool: spawns N worker.js instances, tracks their
                        state, queues/dispatches jobs, emits UI events
index.html             UI: 4 worker-status cards, batch controls, log, heartbeat
```

### 1. The C# side - Bootsharp

[`cs/Program.cs`](cs/Program.cs) exports one method:

```csharp
[Export]
public static string RunJob(int jobId, int durationMs, int askCount) { ... }
```

`dotnet publish` compiles this to WASM and Bootsharp generates an ES module
at `cs/bin/bootsharp/index.mjs` that exports a `Program` object with a
`runJob(jobId, durationMs, askCount)` JS function mirroring the C# method 1:1. All WASM and
assembly binaries are embedded as base64 inside the generated JS - there are
no extra `.wasm` files to serve or fetch.

Calling `Program.runJob(...)` from JS is **synchronous**: it blocks
whichever thread calls it for the duration of the C# method. It doesn't use
shared WASM linear memory or .NET's experimental `browser-mt` threading -
it's one WASM instance running on one thread, called like a normal
(blocking) function.

### 1b. C# asking the UI for input, synchronously

Part-way through `RunJob`, C# calls `[Import] AskUser(jobId, prompt)` - a
**synchronous** call into JS that must return the user's answer. The
worker is blocked inside C#, so its `onmessage` can't run and a
`postMessage` reply would never be seen. Instead:

```
worker (inside C#)                       main thread
askUser(): state = PENDING
           postMessage({type:'ask'}) ──► shows prompt
           Atomics.wait(state)            user types…
           (thread asleep, 0% CPU)        write answer into SharedArrayBuffer
                                          state = ANSWERED; Atomics.notify
           ◄── wakes, reads answer, returns string to C#
```

This works for any number of questions per job, and questions from several
workers queue in the UI and can be answered in any order. Cancelling a
question makes `AskUser` throw into C#, which fails that job but leaves the
worker reusable.

`SharedArrayBuffer` requires the page to be **cross-origin isolated**, so
`serve.json` sends `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp`. In a real app, check that
every third-party script, iframe and asset still loads under COEP.

### 2. One WASM instance per worker - `worker.js`

[`worker.js`](worker.js) is a **module worker**
(`new Worker(url, { type: 'module' })`) that:

1. Immediately imports the Bootsharp module and calls `bootsharp.boot()` -
   this instantiates a fresh, independent WASM/.NET runtime *inside that
   worker's thread*. Every worker gets its own instance; nothing is shared
   between workers.
2. Posts `{ type: 'ready' }` back once boot resolves.
3. From then on, `self.onmessage` stays bound for the worker's whole
   lifetime: each `{ duration }` message triggers one synchronous
   `Program.runJob(...)` call, posting `{ type: 'started' }` before
   and `{ type: 'done', text, elapsed }` after. Because the handler is never
   torn down, the same worker (and its already-booted runtime) can serve any
   number of jobs one after another - this is what makes it reusable as a
   pool member instead of a one-shot worker.

### 3. Treating workers like threads - `pool.js`

[`pool.js`](pool.js) exports `WorkerPool`, a small manager with no
framework dependencies:

- **Spawns a fixed number of workers up front** (`size`, default 4) via
  `worker.js`, each booting its own runtime in parallel.
- **Tracks each worker's state**: `booting` → `idle` → `busy` → back to
  `idle` (or `error`).
- **`pool.run(duration)`** returns a `Promise` and enqueues a job. If a
  worker is `idle`, the job is dispatched immediately; otherwise it waits in
  a FIFO queue.
- **On every `done` message**, the pool marks that worker `idle` again and
  immediately tries to dispatch the next queued job to it - this is the
  "wait for a worker to come free" logic that makes it behave like a thread
  pool rather than just N independent one-off workers.
- **On a worker error**, the pool terminates and respawns that worker (kept
  at id parity) so the pool always stays at full strength, and rejects
  whatever job it was running.
- Emits plain events (`statechange`, `jobstart`, `jobdone`, `queuechange`,
  `error`) that the UI subscribes to - `pool.js` itself has no DOM code, so
  it could be reused headless or with a different UI.

### 4. The UI - `index.html`

Renders one card per worker (live state badge + an animated progress bar
sized to that job's requested duration) plus a log panel. "Run batch"
generates N jobs with random durations in a chosen range and submits them
all via `pool.run()` - the pool naturally runs at most 4 at a time and
queues the rest. On completion it reports **wall-clock time vs. a naive
sequential estimate**, which is the actual proof of concurrency: with 4
workers, 8 jobs finish in roughly a quarter of the time 8 sequential calls
would take, not the sum of their durations.

## Build

Requires the [.NET 10 SDK](https://dotnet.microsoft.com/download) with the
`wasm-tools` workload.

```sh
cd cs
dotnet publish -c Debug
```

This publishes the Bootsharp ES module to `cs/bin/bootsharp/index.mjs`, which
**is committed to this repo** so `npm start` works without the SDK. Re-run
`dotnet publish` whenever `Program.cs` changes and commit the result -
`pool.js`, `worker.js`, and `index.html` need no rebuild step of their own,
they just load whatever is currently published.

> **Release mode** (`dotnet publish`, no `-c` flag) enables the NativeAOT-LLVM
> compiler for a smaller, faster binary but requires LLVM tooling and takes
> longer. Debug mode is recommended during development.

## Run

The page must be served over HTTP - browsers block ES module imports over
`file://`.

```sh
# From the project root (wasm_demo/):
npm start          # runs `serve . -l 8080` - see package.json

# Or without installing anything to the repo:
npx serve . -p 8080
npx http-server . -p 8080   # alternative
```

> **Do not use `python -m http.server`.** It serves `.mjs` files with a
> `Content-Type: text/plain` header. Browsers enforce strict MIME-type
> checking for ES module workers, so `worker.js`'s `import` of
> `bootsharp/index.mjs` fails - and it fails *silently*: the `Worker`
> object's `onerror` event fires with an empty `message`, so nothing useful
> shows up in the log or even the DevTools console without inspecting the
> Network tab. `npx serve` and `npx http-server` both send the correct
> `application/javascript` content type.

Open <http://localhost:8080>. Once all 4 worker cards show **idle**
(runtimes booted), set a job count and a min/max duration range and click
**Run batch**. Observe:

1. The tick counter keeps incrementing the whole time - main thread is free.
2. Worker cards flip to **busy** with a filling progress bar as jobs are
   dispatched, and back to **idle** as each finishes.
3. Jobs beyond the 4th queue (see "queued: N") and pick up automatically as
   workers free.
4. The log traces every dispatch and completion, and the final summary line
   shows wall-clock time next to the sequential estimate - the speedup
   factor is the proof this is real parallelism, not 4 workers pretending.

## Web Worker compatibility findings

Bootsharp v0.9.0 / .NET 10 generates an ES module (`index.mjs`) that can be
imported directly inside a dedicated Web Worker using a **module worker**
(`new Worker(url, { type: 'module' })`). `bootsharp.boot()` completes without
errors inside the worker context.

If you see `document is not defined` or `window is not defined` errors in the
worker console (possible with older .NET / Bootsharp versions), add the
following shims at the very top of `worker.js`, before the `import` statement:

```js
if (typeof document === 'undefined') globalThis.document = {};
if (typeof window  === 'undefined') globalThis.window  = globalThis;
```

This was **not required** with Bootsharp v0.9.0 / .NET 10.
