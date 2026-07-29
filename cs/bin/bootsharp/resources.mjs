import * as generated from "./generated/resources.g.mjs";
/** Lists resource names required to boot the runtime. */
export const manifest = generated.manifest;
/** Fetches resources from the specified root URL or from the embedded resources when in embedded mode. */
export async function fetchResources(root) {
    /* v8 ignore next -- embedded mode is covered in samples */
    if (generated.embedded != null)
        return generated.embedded;
    const [wasm, assemblies, icu, symbols, pdb] = await Promise.all([
        fetchResource(manifest.wasm),
        Promise.all(manifest.assemblies.map(fetchResource)),
        Promise.all(manifest.icu.map(fetchResource)),
        Promise.all(manifest.symbols.map(fetchResource)),
        Promise.all(manifest.pdb.map(fetchResource))
    ]);
    return { wasm: wasm.content, assemblies, icu, symbols, pdb };
    async function fetchResource(name) {
        const content = await (await fetch(`${root}/${name}`)).arrayBuffer();
        return { name, content };
    }
}
