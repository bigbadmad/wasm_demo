import { RuntimeConfig, RuntimeAPI } from "./dotnet/index.mjs";
import { BootResources } from "./resources.mjs";
/** Lifecycle status of the runtime module. */
export declare enum BootStatus {
    /** Ready to boot. */
    Standby = 0,
    /** Async boot process is in progress. */
    Booting = 1,
    /** Booted and ready for interop. */
    Booted = 2
}
/** Custom configuration of the runtime boot process. */
export type BootOptions = {
    /** Custom runtime configuration. */
    readonly config?: RuntimeConfig;
    /** Customization hook for creating the runtime instance. */
    readonly create?: (config: RuntimeConfig) => Promise<RuntimeAPI>;
    /** Customization hook for binding imported C# APIs. */
    readonly import?: (runtime: RuntimeAPI) => Promise<void>;
    /** Customization hook for binding exported C# APIs. */
    readonly export?: (runtime: RuntimeAPI) => Promise<void>;
    /** Customization hook for starting the runtime. */
    readonly run?: (runtime: RuntimeAPI) => Promise<void>;
};
/** Returns current runtime module lifecycle state. */
export declare function getStatus(): BootStatus;
/** Initializes the runtime. When not in embedded mode, resources parameter has to be specified.
 *  @param resources Either URL to the boot resources root (eg, <code>/bin</code>) or the preloaded content.
 *  @param options Allows customizing the boot process and the runtime behaviour.
 *  @return Promise that resolves into the runtime instance when the initialization is finished. */
export declare function boot(resources?: string | BootResources, options?: BootOptions): Promise<RuntimeAPI>;
/** Terminates the runtime and removes WASM module from memory.
 *  @param code Exit code; will use 0 (normal exit) by default.
 *  @param reason Exit reason description (optional). */
export declare function exit(code?: number, reason?: string): Promise<void>;
