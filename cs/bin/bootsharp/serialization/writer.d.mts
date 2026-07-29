export declare class Writer {
    private heap;
    private ptr;
    private offset;
    private capacity;
    private view;
    constructor();
    detach(): bigint;
    writeMeta(value: number): void;
    writeString(value: string | null | undefined): void;
    writeBytes(value: Uint8Array): void;
    writeByte(value: number): void;
    writeSByte(value: number): void;
    writeBool(value: boolean): void;
    writeUInt16(value: number): void;
    writeInt16(value: number): void;
    writeUInt32(value: number): void;
    writeInt32(value: number): void;
    writeUInt64(value: bigint | number): void;
    writeInt64(value: bigint | number): void;
    writeSingle(value: number): void;
    writeDouble(value: number): void;
    private ensure;
    private refreshHeapView;
}
