// Layout of the SharedArrayBuffer a worker blocks on while C# waits for the
// user. Shared by worker.js (reader) and pool.js (writer) so both sides agree
// on offsets and state values.
//
//   Int32 [0]  state   PENDING -> ANSWERED | CANCELLED
//   Int32 [1]  length  of the UTF-8 answer in bytes
//   bytes [8…] answer  UTF-8, truncated to fit

export const ANSWER_SLOT_BYTES = 8 + 64 * 1024;
export const PENDING = 0;
export const ANSWERED = 1;
export const CANCELLED = 2;

const HEADER_BYTES = 8;

// Main thread: write the answer, then flip the state word and wake the worker.
export function writeAnswer(slot, text) {
    const ctrl = new Int32Array(slot, 0, 2);
    // TextEncoder refuses to write into shared memory, so encode normally and
    // copy across - truncating, if needed, on a character boundary (never
    // before a UTF-8 continuation byte, 0b10xxxxxx).
    const bytes = new TextEncoder().encode(text);
    let length = Math.min(bytes.length, slot.byteLength - HEADER_BYTES);
    while (length < bytes.length && (bytes[length] & 0xc0) === 0x80) length--;
    new Uint8Array(slot, HEADER_BYTES).set(bytes.subarray(0, length));
    ctrl[1] = length;
    Atomics.store(ctrl, 0, ANSWERED);
    Atomics.notify(ctrl, 0);
}

export function cancelAnswer(slot) {
    const ctrl = new Int32Array(slot, 0, 2);
    Atomics.store(ctrl, 0, CANCELLED);
    Atomics.notify(ctrl, 0);
}

// Worker: decode the answer. TextDecoder refuses views over shared memory,
// hence the copy (slice) into an ordinary buffer first.
export function readAnswer(slot) {
    const length = new Int32Array(slot, 0, 2)[1];
    return new TextDecoder().decode(new Uint8Array(slot, HEADER_BYTES, length).slice());
}
