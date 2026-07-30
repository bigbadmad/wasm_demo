// ES module worker - boots the Bootsharp .NET runtime once on spawn, then
// handles a single synchronous C# call and posts the result back.
//
// The Bootsharp-generated module is published at cs/bin/bootsharp/index.mjs.
// bootsharp.boot() is async (Promise). Exported C# methods are synchronous
// once boot has resolved - they block this worker thread, not the main thread.

import bootsharp, { Program } from '/cs/bin/bootsharp/index.mjs';
// getHeap() exposes the live WASM linear memory view - its .buffer.byteLength
// is the actual bytes the .NET runtime + business logic library currently
// hold in this worker, so the pool can self-report memory without relying on
// the non-standard, Chromium-only `performance.memory`.
import { getHeap } from '/cs/bin/bootsharp/runtime.mjs';

// Start booting immediately so it overlaps with any parse/fetch time.
// Notify the main thread when ready so it can log the boot event.
const bootPromise = bootsharp.boot();
bootPromise.then(() => self.postMessage({ type: 'ready', memBytes: getHeap().buffer.byteLength }));

self.onmessage = async ({ data: { duration } }) => {
    // Await boot in case this message arrived before boot finished.
    await bootPromise;

    // Let the main thread know the synchronous call is about to start.
    self.postMessage({ type: 'started', duration });

    // Synchronous call - blocks ONLY this worker thread for `duration` ms.
    const t0 = Date.now();
    const text = Program.busyWait(duration);
    const elapsed = Date.now() - t0;

    self.postMessage({ type: 'done', text, elapsed, memBytes: getHeap().buffer.byteLength });
};
