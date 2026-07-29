import { manifest } from "./resources.mjs";
import * as nativeModule from "./dotnet/dotnet.native.js";
import * as runtimeModule from "./dotnet/dotnet.runtime.js";
/** Builds .NET runtime configuration from the specified boot resources. */
export function buildConfig(resources) {
    return {
        resources: {
            wasmNative: [resolveAsset({ name: manifest.wasm, content: resources.wasm })],
            jsModuleNative: [resolveModule("dotnet.native.js", nativeModule)],
            jsModuleRuntime: [resolveModule("dotnet.runtime.js", runtimeModule)],
            assembly: resources.assemblies?.map((resolveAsset)),
            icu: resources.icu?.map((resolveAsset)),
            wasmSymbols: resources.symbols?.map(resolveSymbols),
            pdb: resources.pdb?.map((resolveAsset))
        },
        mainAssemblyName: manifest.entryAssemblyName,
        globalizationMode: resolveGlobalizationMode(),
        debugLevel: resources.symbols ? -1 : undefined
    };
    function resolveModule(name, exports) {
        return { name, moduleExports: exports };
    }
    function resolveAsset(res) {
        const buffer = resolveBinary(res.content);
        return { name: res.name, virtualPath: res.name, buffer };
    }
    function resolveSymbols(res) {
        // Use 'resolveAsset<SymbolsAsset>()' once https://github.com/dotnet/runtime/pull/127087 is merged.
        const txt = new TextDecoder("utf-8").decode(resolveBinary(res.content));
        return {
            name: res.name,
            pendingDownload: {
                name: res.name,
                url: res.name,
                response: Promise.resolve(new Response(txt, { status: 200 }))
            }
        };
    }
    function resolveGlobalizationMode() {
        if (!resources.icu)
            return "invariant";
        if (resources.icu.some(res => res.name === "icudt.dat"))
            return "all";
        return "sharded";
    }
    function resolveBinary(content) {
        if (typeof content !== "string")
            return content;
        return Uint8Array.fromBase64(content).buffer;
    }
}
