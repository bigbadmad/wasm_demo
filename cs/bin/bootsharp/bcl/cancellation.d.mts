import { Event } from "./event.mjs";
/** A cancellation token compatible with C# `CancellationToken`. */
export declare class CancellationToken {
    /** Occurs when the token is cancelled. */
    readonly onCancellationRequested: Event<[]>;
    /** Whether cancellation has been requested. */
    get isCancellationRequested(): boolean;
    private cancelled;
    /** Signal cancellation. */
    cancel(): void;
}
