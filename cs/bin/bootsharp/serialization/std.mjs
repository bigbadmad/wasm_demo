import { binary } from "./serializer.mjs";
const dotnetEpochTicks = 621355968000000000n;
export const std = {
    Boolean: binary((writer, value) => writer.writeBool(value), reader => reader.readBool()),
    Byte: binary((writer, value) => writer.writeByte(value), reader => reader.readByte(), Uint8Array),
    SByte: binary((writer, value) => writer.writeSByte(value), reader => reader.readSByte(), Int8Array),
    Int16: binary((writer, value) => writer.writeInt16(value), reader => reader.readInt16(), Int16Array),
    UInt16: binary((writer, value) => writer.writeUInt16(value), reader => reader.readUInt16(), Uint16Array),
    Int32: binary((writer, value) => writer.writeInt32(value), reader => reader.readInt32(), Int32Array),
    UInt32: binary((writer, value) => writer.writeUInt32(value), reader => reader.readUInt32(), Uint32Array),
    Int64: binary((writer, value) => writer.writeInt64(value), reader => reader.readInt64(), BigInt64Array),
    UInt64: binary((writer, value) => writer.writeUInt64(value), reader => Number(reader.readUInt64())),
    IntPtr: binary((writer, value) => writer.writeInt64(BigInt(value)), reader => Number(reader.readInt64())),
    Single: binary((writer, value) => writer.writeSingle(value), reader => reader.readSingle(), Float32Array),
    Double: binary((writer, value) => writer.writeDouble(value), reader => reader.readDouble(), Float64Array),
    Decimal: binary((writer, value) => writer.writeDouble(value), reader => reader.readDouble()),
    Char: binary((writer, value) => writer.writeUInt16(((String(value ?? ""))[0] ?? "\0").charCodeAt(0)), reader => String.fromCharCode(reader.readUInt16())),
    String: binary((writer, value) => writer.writeString(value), reader => reader.readString()),
    DateTime: binary((writer, value) => writer.writeInt64((BigInt(value.getTime()) * 10000n) + dotnetEpochTicks), reader => new Date(Number((reader.readInt64() - dotnetEpochTicks) / 10000n))),
    DateTimeOffset: binary((writer, value) => writer.writeInt64((BigInt(value.getTime()) * 10000n) + dotnetEpochTicks), reader => new Date(Number((reader.readInt64() - dotnetEpochTicks) / 10000n))),
    Nullable: (inner) => binary((writer, value) => writeNullable(writer, value, inner), reader => readNullable(reader, inner)),
    Array: (element) => binary((writer, value) => writeArray(writer, value, element), reader => readArray(reader, element)),
    List: (element) => binary((writer, value) => writeList(writer, value, element), reader => readList(reader, element)),
    Dictionary: (key, value) => binary((writer, map) => writeDictionary(writer, map, key, value), reader => readDictionary(reader, key, value))
};
function writeNullable(writer, value, inner) {
    writer.writeBool(value != null);
    if (value != null)
        inner.write(writer, value);
}
function readNullable(reader, inner) {
    return reader.readBool() ? inner.read(reader) : null;
}
function writeArray(writer, value, element) {
    if (value == null) {
        writer.writeMeta(-1);
        return;
    }
    writer.writeMeta(value.length);
    if (element.arrayCtor && value instanceof element.arrayCtor)
        writer.writeBytes(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    else
        for (let i = 0; i < value.length; i++)
            element.write(writer, value[i]);
}
function readArray(reader, element) {
    const count = reader.readMeta();
    if (count < 0)
        return null;
    if (element.arrayCtor) {
        const result = new element.arrayCtor(count);
        reader.readBytes(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
        return result;
    }
    const result = new Array(count);
    for (let i = 0; i < count; i++)
        result[i] = element.read(reader);
    return result;
}
function writeList(writer, value, element) {
    if (value == null) {
        writer.writeMeta(-1);
        return;
    }
    writer.writeMeta(value.length);
    for (let i = 0; i < value.length; i++)
        element.write(writer, value[i]);
}
function readList(reader, element) {
    const count = reader.readMeta();
    if (count < 0)
        return null;
    const result = new Array(count);
    for (let i = 0; i < count; i++)
        result[i] = element.read(reader);
    return result;
}
function writeDictionary(writer, map, key, value) {
    if (map == null) {
        writer.writeMeta(-1);
        return;
    }
    writer.writeMeta(map.size);
    for (const pair of map) {
        key.write(writer, pair[0]);
        value.write(writer, pair[1]);
    }
}
function readDictionary(reader, key, value) {
    const count = reader.readMeta();
    if (count < 0)
        return null;
    const result = new Map();
    for (let i = 0; i < count; i++)
        result.set(key.read(reader), value.read(reader));
    return result;
}
