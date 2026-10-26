import { Event } from "../../bcl/event.mjs";
import { exports, getExport } from "../../exports.mjs";
import { importEvent, getImport } from "../../imports.mjs";
import $i from "../instances.g.mjs";
import $s, { serialize, deserialize } from "../serializer.g.mjs";

export const Program = {
    runJob: (jobId, durationMs, askCount) => getExport("Program_RunJob")(jobId, durationMs, askCount),
    get askUser() { return this.askUserHandler; },
    set askUser(handler) { this.askUserHandler = handler; this.askUserSerializedHandler = (jobId, prompt) => this.askUserHandler(jobId, prompt); },
    get askUserSerialized() { return getImport(this.askUserHandler, this.askUserSerializedHandler, "Program.askUser"); },
    get reportProgress() { return this.reportProgressHandler; },
    set reportProgress(handler) { this.reportProgressHandler = handler; this.reportProgressSerializedHandler = (percent) => this.reportProgressHandler(percent); },
    get reportProgressSerialized() { return getImport(this.reportProgressHandler, this.reportProgressSerializedHandler, "Program.reportProgress"); }
};
