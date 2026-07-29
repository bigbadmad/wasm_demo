/** Lists resource file names (including extension) required to boot the runtime. */
export type BootManifest = Readonly<{
    /** Compiled WASM runtime module. */
    wasm: string;
    /** Compiled runtime assemblies. */
    assemblies: string[];
    /** Globalization data. */
    icu: string[];
    /** WASM debug symbols. */
    symbols: string[];
    /** PDB debug artifacts. */
    pdb: string[];
    /** Name of the entry (main) assembly. */
    entryAssemblyName: string;
}>;
/** Resources required to boot the runtime. */
export type BootResources = Readonly<{
    /** Compiled WASM content: either raw bytes or base64 encoded string. */
    wasm: ArrayBuffer | string;
    /** Compiled runtime assemblies. */
    assemblies?: BinaryResource[];
    /** Globalization data. */
    icu?: BinaryResource[];
    /** WASM debug symbols. */
    symbols?: BinaryResource[];
    /** PDB debug artifacts. */
    pdb?: BinaryResource[];
}>;
/** Boot resource with binary content. */
export type BinaryResource = Readonly<{
    /** Name of the file, including extension. */
    name: string;
    /** Binary content of the file: either raw bytes or base64 encoded string. */
    content: ArrayBuffer | string;
}>;
/** Lists resource names required to boot the runtime. */
export declare const manifest: BootManifest;
/** Fetches resources from the specified root URL or from the embedded resources when in embedded mode. */
export declare function fetchResources(root?: string): Promise<BootResources>;
