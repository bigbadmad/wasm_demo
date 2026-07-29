import { Event } from "./bcl/event.mjs";
import { bindImports as bindGeneratedImports } from "./generated/imports.g.mjs";
import { instances } from "./instances.mjs";
export function bindImports(runtime) {
    bindGeneratedImports(runtime);
    runtime.setModuleImports("Bootsharp", { instances });
}
// noinspection JSUnusedGlobalSymbols (used by the generated code)
export function importEvent(handler) {
    const event = new Event();
    const broadcast = event.broadcast.bind(event);
    event.broadcast = (...args) => {
        broadcast(...args);
        handler(...args);
    };
    return event;
}
// noinspection JSUnusedGlobalSymbols (used by the generated code in debug mode)
export function getImport(handler, serializedHandler, name) {
    if (typeof handler !== "function")
        throw Error(`Failed to invoke '${name}' from C#. Make sure to assign the function in JavaScript.`);
    return serializedHandler;
}
