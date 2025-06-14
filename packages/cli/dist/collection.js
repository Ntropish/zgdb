/**
 * A Collection represents a set of entities of a specific type (e.g., Posts, Users).
 * It provides methods to query and manipulate the data using RxJS Observables.
 */
export class Collection {
    ptree;
    entityName;
    serializers;
    constructor(ptree, entityName, serializers) {
        this.ptree = ptree;
        this.entityName = entityName;
        this.serializers = serializers;
    }
    /**
     * Adds a new item to the collection.
     * @param item The domain object to add.
     * @returns An Observable that emits the newly added item.
     */
    add(item) {
        // In a real implementation, you'd use the toFlatBuffer method here.
        const addedItem = this.dataStore.add(this.serializers.entityName, item);
        return of(this.serializers.fromFlatBuffer(addedItem));
    }
    /**
     * Gets a single item by its ID.
     * @param id The ID of the item to retrieve.
     * @returns An Observable that emits the found item, or completes without emitting if not found.
     */
    get(id) {
        const item = this.dataStore.get(this.serializers.entityName, id);
        return item ? of(this.serializers.fromFlatBuffer(item)) : of(); // Emits nothing if not found
    }
    *[Symbol.iterator]() {
        if (!this.ptree) {
            throw new Error("PTree is not initialized");
        }
        for (const item of this.ptree.getSync(this.serializers.entityName)) {
            yield this.serializers.fromFlatBuffer(item);
        }
    }
}
