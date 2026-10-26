import type * as $bcl from "../../bcl/index.mjs";

export namespace Program {
    export function runJob(jobId: number, durationMs: number, askCount: number): string;
    export let askUser: (jobId: number, prompt: string) => string;
    export let reportProgress: (percent: number) => void;
}
