import * as index from "./modules/index.g.mjs";

export function bindImports(runtime) {
    runtime.setModuleImports("index", index);
}