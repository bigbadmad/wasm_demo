import { Reader } from "./reader.mjs";
import { Writer } from "./writer.mjs";
export function binary(write, read, arrayCtor) {
    return { write, read, arrayCtor };
}
export function serialize(value, type) {
    if (value == null)
        return 0n;
    const writer = new Writer();
    type.write(writer, value);
    return writer.detach();
}
export function deserialize(handle, type) {
    if (handle == null || handle === 0n)
        return null;
    const reader = new Reader(handle);
    const result = type.read(reader);
    reader.dispose();
    return result;
}
