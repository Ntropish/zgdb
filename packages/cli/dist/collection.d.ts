import { PTree } from "prolly-gunna";
/**
 * An interface representing the underlying data store (e.g., your PTree).
 * This will be responsible for the actual data retrieval and storage.
 */
export interface IDataStore {
    findAll(entityName: string): IterableIterator<any>;
    add(entityName: string, itemData: any): any;
    get(entityName: string, id: string): any | undefined;
}
/**
 * An interface representing the generated FlatBuffer code for a specific entity.
 * This will handle serialization and deserialization.
 */
export interface IEntitySerializers<T> {
    readonly entityName: string;
    fromFlatBuffer(fbObj: any): T;
    toFlatBuffer(builder: any, obj: T): any;
}
/**
 * A Collection represents a set of entities of a specific type (e.g., Posts, Users).
 * It provides methods to query and manipulate the data using RxJS Observables.
 */
export declare class Collection<T extends {
    id: string;
}> {
    private readonly ptree;
    private readonly entityName;
    private readonly serializers;
    constructor(ptree: PTree, entityName: string, serializers: IEntitySerializers<T>);
    /**
     * Adds a new item to the collection.
     * @param item The domain object to add.
     * @returns An Observable that emits the newly added item.
     */
    add(item: Omit<T, "id"> & {
        id?: string;
    }): Observable<T>;
    /**
     * Gets a single item by its ID.
     * @param id The ID of the item to retrieve.
     * @returns An Observable that emits the found item, or completes without emitting if not found.
     */
    get(id: string): Observable<T>;
    [Symbol.iterator](): IterableIterator<T>;
}
