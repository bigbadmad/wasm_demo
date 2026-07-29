import { Collection } from "./collection.mjs";
/** A list of items compatible with C# `IList<T>`. */
export class List extends Collection {
    /** Returns the item at the specified index. */
    getAt(index) {
        return this.items[index];
    }
    /** Assigns the specified item at the specified index. */
    setAt(index, item) {
        this.items[index] = item;
    }
    /** Returns the index of the first occurrence of the specified item, or -1 when not found. */
    indexOf(item) {
        return this.items.indexOf(item);
    }
    /** Inserts the specified item at the specified index. */
    insert(index, item) {
        this.items.splice(index, 0, item);
    }
    /** Removes the item at the specified index. */
    removeAt(index) {
        this.items.splice(index, 1);
    }
}
