import { Event } from "./event.mjs";
/** A cancellation token compatible with C# `CancellationToken`. */
export class CancellationToken {
    /** Occurs when the token is cancelled. */
    onCancellationRequested = new Event();
    /** Whether cancellation has been requested. */
    get isCancellationRequested() { return this.cancelled; }
    cancelled = false;
    /** Signal cancellation. */
    cancel() {
        if (this.cancelled)
            return;
        this.cancelled = true;
        this.onCancellationRequested.broadcast();
    }
}
