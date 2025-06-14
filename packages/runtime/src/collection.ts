import { PTree } from "prolly-gunna";
import * as flatbuffers from "flatbuffers";

/**
 * An interface representing the generated FlatBuffer code for a specific entity.
 * This will handle serialization and deserialization.
 */
export interface IEntitySerializers<T> {
  // A property to identify the entity, e.g., 'Post'.
  readonly entityName: string;
  // A function to create a domain object from a FlatBuffer object.
  fromFlatBuffer(fbObj: any): T;
  // A function to create a FlatBuffer object from a domain object.
  toFlatBuffer(builder: any, obj: T): any; // The `any` here would be your FlatBuffer builder
}

/**
 * A Collection represents a set of entities of a specific type (e.g., Posts, Users).
 * It provides methods to query and manipulate the data using RxJS Observables.
 */
export class Collection<T extends { id: string }> {
  private readonly ptree: PTree;
  private readonly entityName: string;
  private readonly serializers: IEntitySerializers<T>;
  private readonly getRootAs: (bb: flatbuffers.ByteBuffer, obj?: T) => T;

  constructor(
    ptree: PTree,
    entityName: string,
    serializers: IEntitySerializers<T>,
    getRootAs: (bb: flatbuffers.ByteBuffer, obj?: T) => T
  ) {
    this.ptree = ptree;
    this.entityName = entityName;
    this.serializers = serializers;
    this.getRootAs = getRootAs;
  }

  /**
   * Adds a new item to the collection.
   * @param item The domain object to add.
   * @returns An Observable that emits the newly added item.
   */
  add(item: Omit<T, "id"> & { id?: string }): T {
    // In a real implementation, you'd use the toFlatBuffer method here.
    const addedItem = this.ptree.insertSync(this.serializers.entityName, item);
    return this.serializers.fromFlatBuffer(addedItem);
  }

  /**
   * Gets a single item by its ID.
   * @param id The ID of the item to retrieve.
   * @returns An Observable that emits the found item, or completes without emitting if not found.
   */
  get(id: string): Observable<T> {
    const item = this.dataStore.get(this.serializers.entityName, id);
    return item ? of(this.serializers.fromFlatBuffer(item)) : of(); // Emits nothing if not found
  }

  *[Symbol.iterator](): IterableIterator<T> {
    if (!this.ptree) {
      throw new Error("PTree is not initialized");
    }
    for (const item of this.ptree.getSync(this.serializers.entityName)) {
      yield this.serializers.fromFlatBuffer(item);
    }
  }
}
