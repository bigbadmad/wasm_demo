import { getHeap, malloc, free } from "../runtime.mjs";
export class Writer {
    heap;
    ptr;
    offset;
    capacity;
    view;
    constructor() {
        this.capacity = 256;
        this.ptr = malloc(this.capacity);
        this.offset = 0;
        this.heap = getHeap();
        this.view = new DataView(this.heap.buffer, this.heap.byteOffset);
    }
    detach() {
        const handle = BigInt(this.ptr >>> 0);
        this.ptr = 0;
        this.capacity = 0;
        this.offset = 0;
        return handle;
    }
    writeMeta(value) {
        let zigzag = ((value << 1) ^ (value >> 31)) >>> 0;
        this.ensure(5);
        let position = this.ptr + this.offset;
        while (zigzag >= 0x80) {
            this.heap[position++] = (zigzag | 0x80) & 0xff;
            zigzag >>>= 7;
        }
        this.heap[position++] = zigzag;
        this.offset = position - this.ptr;
    }
    writeString(value) {
        if (value == null) {
            this.writeMeta(-1);
            return;
        }
        const length = value.length;
        const bytes = length * 2;
        this.writeMeta(length);
        this.ensure(bytes);
        const base = this.ptr + this.offset;
        for (let i = 0, p = base; i < length; i++, p += 2)
            this.view.setUint16(p, value.charCodeAt(i), true);
        this.offset += bytes;
    }
    writeBytes(value) {
        this.ensure(value.byteLength);
        this.heap.set(value, this.ptr + this.offset);
        this.offset += value.byteLength;
    }
    writeByte(value) {
        this.ensure(1);
        this.heap[this.ptr + this.offset++] = value & 0xff;
    }
    writeSByte(value) {
        this.writeByte(value);
    }
    writeBool(value) {
        this.writeByte(value ? 1 : 0);
    }
    writeUInt16(value) {
        this.ensure(2);
        this.view.setUint16(this.ptr + this.offset, value, true);
        this.offset += 2;
    }
    writeInt16(value) {
        this.ensure(2);
        this.view.setInt16(this.ptr + this.offset, value, true);
        this.offset += 2;
    }
    writeUInt32(value) {
        this.ensure(4);
        this.view.setUint32(this.ptr + this.offset, value, true);
        this.offset += 4;
    }
    writeInt32(value) {
        this.ensure(4);
        this.view.setInt32(this.ptr + this.offset, value, true);
        this.offset += 4;
    }
    writeUInt64(value) {
        this.ensure(8);
        this.view.setBigUint64(this.ptr + this.offset, BigInt(value), true);
        this.offset += 8;
    }
    writeInt64(value) {
        this.ensure(8);
        this.view.setBigInt64(this.ptr + this.offset, BigInt(value), true);
        this.offset += 8;
    }
    writeSingle(value) {
        this.ensure(4);
        this.view.setFloat32(this.ptr + this.offset, value, true);
        this.offset += 4;
    }
    writeDouble(value) {
        this.ensure(8);
        this.view.setFloat64(this.ptr + this.offset, value, true);
        this.offset += 8;
    }
    ensure(count) {
        if (this.capacity - this.offset >= count)
            return;
        const capacity = Math.max(this.capacity * 2, this.offset + count);
        const sourcePtr = this.ptr;
        const ptr = malloc(capacity);
        this.refreshHeapView();
        this.heap.copyWithin(ptr, sourcePtr, sourcePtr + this.offset);
        free(sourcePtr);
        this.ptr = ptr;
        this.capacity = capacity;
    }
    refreshHeapView() {
        const heap = getHeap();
        /* v8 ignore next -- uncoverable, as WASM heap growth is not controllable */
        if (this.heap === heap)
            return;
        this.heap = heap;
        this.view = new DataView(heap.buffer, heap.byteOffset);
    }
}
