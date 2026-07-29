/** A collection of items compatible with C# `ICollection<T>`. */
export class Collection {
    items;
    constructor(items) {
        this.items = items != null ? Array.from(items) : [];
    }
    /** Number of items in the collection. */
    get count() {
        return this.items.length;
    }
    /** Adds the specified item to the collection. */
    add(item) {
        this.items.push(item);
    }
    /** Removes the first occurrence of the specified item from the collection.
     *  @returns true when the item was removed; false when it wasn't found. */
    remove(item) {
        const idx = this.items.indexOf(item);
        if (idx < 0)
            return false;
        this.items.splice(idx, 1);
        return true;
    }
    /** Removes all items from the collection. */
    clear() {
        this.items.length = 0;
    }
    /** Whether the collection contains the specified item. */
    contains(item) {
        return this.items.indexOf(item) >= 0;
    }
    /** Returns a fresh array with a snapshot of the current items. */
    copy() {
        return this.items.slice();
    }
    [Symbol.iterator]() {
        return this.copy()[Symbol.iterator]();
    }
}
