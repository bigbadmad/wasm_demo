export let exports;
export async function bindExports(runtime, assembly) {
    const asm = await runtime.getAssemblyExports(assembly);
    exports = asm["Bootsharp"]["Generated"]["Interop"] ?? {};
    exports.disposeExported = asm["Bootsharp"]["Generated"]["Instances"].DisposeExported;
}
// noinspection JSUnusedGlobalSymbols (used by the generated code in debug mode)
export function getExport(name) {
    return (...args) => {
        if (exports == null)
            throw Error("Boot the runtime before invoking C# APIs.");
        let result;
        try {
            result = exports[name](...args);
        }
        catch (error) {
            throw Error(`${error.message}\n${error.stack}`);
        }
        if (typeof result?.then === "function")
            return result.catch(error => {
                throw Error(`${error.message}\n${error.stack}`);
            });
        return result;
    };
}
