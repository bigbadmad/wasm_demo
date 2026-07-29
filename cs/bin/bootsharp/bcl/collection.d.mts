/** A collection of items compatible with C# `ICollection<T>`. */
export declare class Collection<T> {
    protected readonly items: T[];
    constructor(items?: Iterable<T>);
    /** Number of items in the collection. */
    get count(): number;
    /** Adds the specified item to the collection. */
    add(item: T): void;
    /** Removes the first occurrence of the specified item from the collection.
     *  @returns true when the item was removed; false when it wasn't found. */
    remove(item: T): boolean;
    /** Removes all items from the collection. */
    clear(): void;
    /** Whether the collection contains the specified item. */
    contains(item: T): boolean;
    /** Returns a fresh array with a snapshot of the current items. */
    copy(): T[];
    [Symbol.iterator](): IterableIterator<T>;
}
