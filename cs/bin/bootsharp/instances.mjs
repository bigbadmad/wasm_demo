import { exports } from "./exports.mjs";
const exportedFinalizer = new FinalizationRegistry(finalizeExported);
const exportedById = new Map();
const importedById = new Map();
const idByImported = new Map();
const onDisposeById = new Map();
const idPool = new Array();
let nextId = 1; // JS IDs are positive; C#'s — negative; 0 reserved for null.
export const instances = {
    /** Resolves a registered instance associated with the specified ID,
     *  or uses the specified factory to register a new exported instance. */
    resolve(id, factory) {
        if (id === 0)
            return null;
        if (id > 0)
            return importedById.get(id);
        const exported = exportedById.get(id)?.deref();
        if (exported != null)
            return exported;
        const proxy = new factory(id);
        exportedById.set(id, new WeakRef(proxy));
        exportedFinalizer.register(proxy, id);
        return proxy;
    },
    /** Registers specified imported (JS) instance and returns the associated unique ID.
     *  Short-circuits already registered imported and exported instances. */
    import(instance, cb) {
        if (instance == null)
            return 0;
        const exportedId = instance?._id;
        if (exportedId !== undefined)
            return exportedId;
        const importedId = idByImported.get(instance);
        if (importedId !== undefined)
            return importedId;
        const id = idPool.length > 0 ? idPool.pop() : nextId++;
        importedById.set(id, instance);
        idByImported.set(instance, id);
        if (cb != null)
            onDisposeById.set(id, cb(id));
        return id;
    },
    /** Returns a registered imported instance associated with the specified ID. */
    imported(id) {
        return importedById.get(id);
    },
    /** Invoked from C# to notify that the imported (JS -> C#) instance is no longer used
     *  (eg, was garbage collected) and can be released on the JavaScript side as well.
     *  @param id Unique identifier of the disposed instance. */
    disposeImported(id) {
        idByImported.delete(importedById.get(id));
        importedById.delete(id);
        onDisposeById.get(id)?.();
        onDisposeById.delete(id);
        idPool.push(id);
    }
};
/* v8 ignore start -- uncoverable, as finalization in Node is not controllable */
function finalizeExported(id) {
    exportedById.delete(id);
    exports.disposeExported(id);
}
/* v8 ignore stop */
