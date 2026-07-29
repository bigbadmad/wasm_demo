export declare const instances: {
    /** Resolves a registered instance associated with the specified ID,
     *  or uses the specified factory to register a new exported instance. */
    resolve<T extends object>(id: number, factory: new (id: number) => T): T | null;
    /** Registers specified imported (JS) instance and returns the associated unique ID.
     *  Short-circuits already registered imported and exported instances. */
    import(instance?: object, cb?: (id: number) => () => void): number;
    /** Returns a registered imported instance associated with the specified ID. */
    imported(id: number): object;
    /** Invoked from C# to notify that the imported (JS -> C#) instance is no longer used
     *  (eg, was garbage collected) and can be released on the JavaScript side as well.
     *  @param id Unique identifier of the disposed instance. */
    disposeImported(id: number): void;
};
