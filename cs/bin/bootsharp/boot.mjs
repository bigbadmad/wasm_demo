import { app } from "./dotnet/index.mjs";
import { fetchResources } from "./resources.mjs";
import { buildConfig } from "./config.mjs";
import { bindImports } from "./imports.mjs";
import { bindExports } from "./exports.mjs";
import { setRuntime } from "./runtime.mjs";
/** Lifecycle status of the runtime module. */
export var BootStatus;
(function (BootStatus) {
    /** Ready to boot. */
    BootStatus[BootStatus["Standby"] = 0] = "Standby";
    /** Async boot process is in progress. */
    BootStatus[BootStatus["Booting"] = 1] = "Booting";
    /** Booted and ready for interop. */
    BootStatus[BootStatus["Booted"] = 2] = "Booted";
})(BootStatus || (BootStatus = {}));
let status = BootStatus.Standby;
/** Returns current runtime module lifecycle state. */
export function getStatus() {
    return status;
}
/** Initializes the runtime. When not in embedded mode, resources parameter has to be specified.
 *  @param resources Either URL to the boot resources root (eg, <code>/bin</code>) or the preloaded content.
 *  @param options Allows customizing the boot process and the runtime behaviour.
 *  @return Promise that resolves into the runtime instance when the initialization is finished. */
export async function boot(resources, options) {
    if (status === BootStatus.Booted)
        throw Error("Failed to boot the C# runtime: already booted.");
    if (status === BootStatus.Booting)
        throw Error("Failed to boot the C# runtime: already booting.");
    status = BootStatus.Booting;
    const runtime = await createRuntime(resources, options ?? {});
    status = BootStatus.Booted;
    return runtime;
}
/** Terminates the runtime and removes WASM module from memory.
 *  @param code Exit code; will use 0 (normal exit) by default.
 *  @param reason Exit reason description (optional). */
export async function exit(code, reason) {
    /* v8 ignore start -- uncoverable, as exit terminates the host test process */
    if (status !== BootStatus.Booted)
        throw Error("Failed to exit the C# runtime: not booted.");
    try {
        app.exit(code ?? 0, reason);
    }
    catch { }
    finally {
        status = BootStatus.Standby;
    }
    /* v8 ignore stop */
}
async function createRuntime(res, opt) {
    const cfg = opt.config ?? buildConfig(typeof res === "object" ? res : await fetchResources(res));
    const runtime = await opt.create?.(cfg) || await app.dotnet.withConfig(cfg).create();
    setRuntime(runtime);
    if (opt.import)
        await opt.import(runtime);
    else
        bindImports(runtime);
    if (opt.run)
        await opt.run(runtime);
    else
        await runtime.runMain(cfg.mainAssemblyName, []);
    if (opt.export)
        await opt.export(runtime);
    else
        await bindExports(runtime, cfg.mainAssemblyName);
    return runtime;
}
