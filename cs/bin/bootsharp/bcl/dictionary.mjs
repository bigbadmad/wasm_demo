/** A dictionary of key-value pairs compatible with C# `IDictionary<TKey, TValue>`. */
export class Dictionary {
    map;
    constructor(entries) {
        this.map = new Map(entries);
    }
    /** Number of key-value pairs in the dictionary. */
    get count() {
        return this.map.size;
    }
    /** Associates the specified value with the specified key. */
    add(key, value) {
        this.map.set(key, value);
    }
    /** Whether the dictionary contains the specified key. */
    containsKey(key) {
        return this.map.has(key);
    }
    /** Removes the value with the specified key from the dictionary.
     *  @returns true when the key was removed; false when it wasn't found. */
    remove(key) {
        return this.map.delete(key);
    }
    /** Removes all key-value pairs from the dictionary. */
    clear() {
        this.map.clear();
    }
    /** Returns the value associated with the specified key. */
    getAt(key) {
        return this.map.get(key);
    }
    /** Associates the specified value with the specified key. */
    setAt(key, value) {
        this.map.set(key, value);
    }
    /** Returns a fresh array with a snapshot of the current keys. */
    getKeys() {
        return Array.from(this.map.keys());
    }
    /** Returns a fresh array with a snapshot of the current values. */
    getValues() {
        return Array.from(this.map.values());
    }
    [Symbol.iterator]() {
        return this.map[Symbol.iterator]();
    }
}
