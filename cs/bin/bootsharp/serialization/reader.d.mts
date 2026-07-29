export declare class Reader {
    private readonly heap;
    private readonly ptr;
    private offset;
    private view;
    constructor(handle: bigint);
    dispose(): void;
    readMeta(): number;
    readString(): string | null;
    readBytes(destination: Uint8Array): void;
    readByte(): number;
    readSByte(): number;
    readBool(): boolean;
    readUInt16(): number;
    readInt16(): number;
    readUInt32(): number;
    readInt32(): number;
    readUInt64(): bigint;
    readInt64(): bigint;
    readSingle(): number;
    readDouble(): number;
}
