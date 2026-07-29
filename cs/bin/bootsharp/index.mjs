import { boot, exit, getStatus, BootStatus } from "./boot.mjs";
import { manifest } from "./resources.mjs";
import { app } from "./dotnet/index.mjs";
export default {
    boot,
    exit,
    getStatus,
    BootStatus,
    manifest,
    dotnet: app.dotnet
};
export * from "./bcl/index.mjs";
export * from "./generated/modules/index.g.mjs";
