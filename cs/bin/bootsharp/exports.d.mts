import type { RuntimeAPI } from "./dotnet/index.mjs";
export declare let exports: Record<string, unknown>;
export declare function bindExports(runtime: RuntimeAPI, assembly: string): Promise<void>;
export declare function getExport(name: string): (...args: unknown[]) => unknown;
