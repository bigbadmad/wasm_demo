/** A dictionary of key-value pairs compatible with C# `IDictionary<TKey, TValue>`. */
export declare class Dictionary<TKey, TValue> {
    protected readonly map: Map<TKey, TValue>;
    constructor(entries?: Iterable<[TKey, TValue]>);
    /** Number of key-value pairs in the dictionary. */
    get count(): number;
    /** Associates the specified value with the specified key. */
    add(key: TKey, value: TValue): void;
    /** Whether the dictionary contains the specified key. */
    containsKey(key: TKey): boolean;
    /** Removes the value with the specified key from the dictionary.
     *  @returns true when the key was removed; false when it wasn't found. */
    remove(key: TKey): boolean;
    /** Removes all key-value pairs from the dictionary. */
    clear(): void;
    /** Returns the value associated with the specified key. */
    getAt(key: TKey): TValue;
    /** Associates the specified value with the specified key. */
    setAt(key: TKey, value: TValue): void;
    /** Returns a fresh array with a snapshot of the current keys. */
    getKeys(): TKey[];
    /** Returns a fresh array with a snapshot of the current values. */
    getValues(): TValue[];
    [Symbol.iterator](): IterableIterator<[TKey, TValue]>;
}
