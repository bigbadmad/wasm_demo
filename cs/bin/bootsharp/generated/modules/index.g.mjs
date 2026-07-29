import { Event } from "../../bcl/event.mjs";
import { exports, getExport } from "../../exports.mjs";
import { importEvent, getImport } from "../../imports.mjs";
import $i from "../instances.g.mjs";
import $s, { serialize, deserialize } from "../serializer.g.mjs";

export const Program = {
    busyWait: (durationMs) => getExport("Program_BusyWait")(durationMs)
};
