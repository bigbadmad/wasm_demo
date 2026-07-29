import { serialize, deserialize, binary } from "./serializer.mjs";
import { std } from "./std.mjs";
declare const serialization: {
    serialize: typeof serialize;
    deserialize: typeof deserialize;
    binary: typeof binary;
    std: typeof std;
    [factoryId: string]: unknown;
};
export default serialization;
