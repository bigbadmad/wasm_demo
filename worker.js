// ES module worker - boots the Bootsharp .NET runtime once on spawn, then
// handles a single synchronous C# call per job and posts the result back.
//
// The Bootsharp-generated module is published at cs/bin/bootsharp/index.mjs.
// bootsharp.boot() is async (Promise). Exported C# methods are synchronous
// once boot has resolved - they block this worker thread, not the main thread.
//
// Mid-job, C# may call back into JS *synchronously* to ask the UI for input
// (Program.askUser). This worker's event loop is frozen for the whole C#
// call, so the answer can't come back as a postMessage - onmessage would
// never run. Instead the main thread writes it into a SharedArrayBuffer and
// wakes us with Atomics.notify while we sleep in Atomics.wait.

import bootsharp, { Program } from '/cs/bin/bootsharp/index.mjs';
// getHeap() exposes the live WASM linear memory view - its .buffer.byteLength
// is the actual bytes the .NET runtime + business logic library currently
// hold in this worker, so the pool can self-report memory without relying on
// the non-standard, Chromium-only `performance.memory`.
import { getHeap } from '/cs/bin/bootsharp/runtime.mjs';
import { ANSWER_SLOT_BYTES, PENDING, CANCELLED, readAnswer } from '/answer-slot.js';

// One reply slot per worker, reused for every question it ever asks: an
// Int32 state word, an Int32 byte length, then the UTF-8 answer bytes. Handed
// to the pool once, in the 'ready' message.
const slot = new SharedArrayBuffer(ANSWER_SLOT_BYTES);
const ctrl = new Int32Array(slot, 0, 2);

class AnswerCancelled extends Error {}

Program.askUser = (jobId, prompt) => {
    Atomics.store(ctrl, 0, PENDING);
    self.postMessage({ type: 'ask', jobId, prompt });
    // Sleeps this thread (0% CPU) until the main thread flips the state word.
    // Legal in a worker; Atomics.wait throws on the main thread.
    Atomics.wait(ctrl, 0, PENDING);
    if (Atomics.load(ctrl, 0) === CANCELLED) throw new AnswerCancelled(`job #${jobId}: user cancelled "${prompt}"`);
    return readAnswer(slot);
};

// postMessage is just an enqueue, so it works fine from inside a blocking
// C# call - the main thread receives these while we're still busy.
Program.reportProgress = (percent) => self.postMessage({ type: 'progress', percent });

// Start booting immediately so it overlaps with any parse/fetch time.
// Notify the main thread when ready so it can log the boot event.
const bootPromise = bootsharp.boot();
bootPromise.then(() => self.postMessage({ type: 'ready', slot, memBytes: getHeap().buffer.byteLength }));

self.onmessage = async ({ data: { jobId, duration, askCount } }) => {
    // Await boot in case this message arrived before boot finished.
    await bootPromise;

    // Let the main thread know the synchronous call is about to start.
    self.postMessage({ type: 'started', duration });

    // Synchronous call - blocks ONLY this worker thread, including any time
    // spent waiting on the user.
    const t0 = Date.now();
    try {
        const text = Program.runJob(jobId, duration, askCount);
        self.postMessage({ type: 'done', text, elapsed: Date.now() - t0, memBytes: getHeap().buffer.byteLength });
    } catch (err) {
        // A cancelled answer surfaces in C# as an exception thrown out of
        // AskUser; uncaught there, it unwinds back out of runJob to here. The
        // runtime is still healthy, so this is a failed job, not a dead worker.
        self.postMessage({ type: 'failed', message: err.message, elapsed: Date.now() - t0, memBytes: getHeap().buffer.byteLength });
    }
};
