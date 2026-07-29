import { RuntimeConfig } from "./dotnet/index.mjs";
import { BootResources } from "./resources.mjs";
/** Builds .NET runtime configuration from the specified boot resources. */
export declare function buildConfig(resources: BootResources): RuntimeConfig;
