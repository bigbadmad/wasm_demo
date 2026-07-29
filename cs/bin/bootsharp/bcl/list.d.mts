import { Collection } from "./collection.mjs";
/** A list of items compatible with C# `IList<T>`. */
export declare class List<T> extends Collection<T> {
    /** Returns the item at the specified index. */
    getAt(index: number): T;
    /** Assigns the specified item at the specified index. */
    setAt(index: number, item: T): void;
    /** Returns the index of the first occurrence of the specified item, or -1 when not found. */
    indexOf(item: T): number;
    /** Inserts the specified item at the specified index. */
    insert(index: number, item: T): void;
    /** Removes the item at the specified index. */
    removeAt(index: number): void;
}
