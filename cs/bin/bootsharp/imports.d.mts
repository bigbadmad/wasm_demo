import { Event } from "./bcl/event.mjs";
import type { RuntimeAPI } from "./dotnet/index.mjs";
export declare function bindImports(runtime: RuntimeAPI): void;
export declare function importEvent<T extends unknown[]>(handler: (...args: [...T]) => void): Event<T>;
export declare function getImport<T>(handler: unknown, serializedHandler: T, name: string): T;
