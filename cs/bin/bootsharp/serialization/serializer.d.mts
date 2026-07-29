import { Reader } from "./reader.mjs";
import { Writer } from "./writer.mjs";
export type Binary<T> = {
    write: Write<T>;
    read: Read<T>;
    arrayCtor?: TypedArrayCtor;
};
type Write<T> = (writer: Writer, value: T) => void;
type Read<T> = (reader: Reader) => T | null;
type TypedArrayCtor = new (length: number) => TypedArray;
type TypedArray = Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | BigInt64Array | Float32Array | Float64Array;
export declare function binary<T>(write: Write<T>, read: Read<T>, arrayCtor?: TypedArrayCtor): Binary<T>;
export declare function serialize<T>(value: T | null | undefined, type: Binary<T>): bigint;
export declare function deserialize<T>(handle: bigint | null | undefined, type: Binary<T>): T | null;
export {};
