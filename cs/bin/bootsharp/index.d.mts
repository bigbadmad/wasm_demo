import { boot, exit, getStatus, BootStatus } from "./boot.mjs";
declare const _default: {
    boot: typeof boot;
    exit: typeof exit;
    getStatus: typeof getStatus;
    BootStatus: typeof BootStatus;
    manifest: Readonly<{
        wasm: string;
        assemblies: string[];
        icu: string[];
        symbols: string[];
        pdb: string[];
        entryAssemblyName: string;
    }>;
    dotnet: import("./dotnet/dotnet.g.js").DotnetHostBuilder;
};
export default _default;
export * from "./bcl/index.mjs";
export * from "./generated/modules/index.g.mjs";
export type { BootOptions } from "./boot.mjs";
export type { BootManifest, BootResources, BinaryResource } from "./resources.mjs";
