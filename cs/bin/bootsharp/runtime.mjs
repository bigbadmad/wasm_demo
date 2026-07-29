let runtime;
/** Assigns the initialized .NET runtime to be used by Bootsharp. */
export function setRuntime(value) {
    runtime = value;
}
export function getHeap() {
    return runtime.localHeapViewU8();
}
export function malloc(size) {
    return Number(runtime.Module._malloc(size));
}
export function free(ptr) {
    runtime.Module._free(ptr);
}
