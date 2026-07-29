/** Allows attaching handlers and broadcasting events; compatible with C# events. */
export class Event {
    handlers = new Map();
    warn;
    lastArgs;
    /** Creates new event instance. */
    constructor(options) {
        this.warn = options?.warn ?? console.warn;
    }
    /** Notifies attached handlers with specified payload.
     *  @param args The payload of the notification. */
    broadcast(...args) {
        this.lastArgs = args;
        for (const handler of this.handlers.values())
            handler(...this.lastArgs);
    }
    /** Attaches specified handler for events emitted by this event instance.
     *  @param handler The handler to attach. */
    subscribe(handler) {
        const id = this.getOrDefineId(handler);
        this.subscribeById(id, handler);
        return id;
    }
    /** Detaches specified handler from events emitted by this event instance.
     *  @param handler The handler to detach. */
    unsubscribe(handler) {
        if (handler == null)
            return;
        const id = this.getOrDefineId(handler);
        this.unsubscribeById(id);
    }
    /** Attaches handler with specified identifier for events emitted by this event instance.
     *  @param id Identifier of the handler.
     *  @param handler The handler to attach. */
    subscribeById(id, handler) {
        if (this.handlers.has(id))
            this.warn(`Failed to subscribe event handler with ID '${id}': handler is already subscribed.`);
        else
            this.handlers.set(id, handler);
    }
    /** Detaches handler with specified identifier from events emitted by this event instance.
     *  @param id Identifier of the handler. */
    unsubscribeById(id) {
        if (this.handlers.has(id))
            this.handlers.delete(id);
        else
            this.warn(`Failed to unsubscribe event handler with ID '${id}': handler is not subscribed.`);
    }
    /** In case event was broadcast at least once, returns last payload; undefined otherwise. */
    get last() {
        return this.lastArgs;
    }
    getOrDefineId(handler) {
        const prop = "bootsharpEventHandlerId";
        if (handler.hasOwnProperty(prop))
            return handler[prop];
        const id = crypto.randomUUID();
        Object.defineProperty(handler, prop, {
            value: id,
            enumerable: false,
            writable: false
        });
        return id;
    }
}
