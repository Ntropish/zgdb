import { PTree } from "prolly-gunna";
import * as flatbuffers from "flatbuffers";
import type { StandardSchemaV1 } from "@standard-schema/spec";

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
export class Collection<T extends StandardSchemaV1> {
  private readonly ptree: PTree;

  /**
   * Get the key to store in the ptree from the entity.
   */
  private readonly getKey: (item: T) => Uint8Array;

  /**
   * Get the value to store in the ptree from the entity.
   */
  private readonly getValue: (item: T) => Uint8Array;

  /**
   * Get the entity from the buffer.
   */
  private readonly getEntity: (buffer: Uint8Array) => T;

  private readonly schema: T;

  constructor(
    ptree: PTree,
    getKey: (item: T) => Uint8Array,
    getValue: (item: T) => Uint8Array,
    getEntity: (buffer: Uint8Array) => T,
    schema: T
  ) {
    this.ptree = ptree;
    this.getKey = getKey;
    this.getValue = getValue;
    this.getEntity = getEntity;
    this.schema = schema;
  }

  /**
   * Adds a new item to the collection.
   * @param item The domain object to add.
   */
  add(item: T): T {
    const key = this.getKey(item);
    const value = this.getValue(item);
    this.ptree.insertSync(key, value);
    return this.getEntity(value);
  }

  /**
   * Gets a single item by its ID.
   * @param id The ID of the item to retrieve.
   * @returns An Observable that emits the found item, or completes without emitting if not found.
   */
  get(id: Uint8Array): T {
    const value = this.ptree.getSync(id);
    if (!value) {
      throw new Error("Item not found");
    }
    return this.getEntity(value);
  }

  *[Symbol.iterator](): IterableIterator<T> {
    if (!this.ptree) {
      throw new Error("PTree is not initialized");
    }

    const snapshot = this.ptree

    let offset = 0;

    while (true) {
      const page = this.ptree.scanItemsSync({
        limit: 100,
        offset,
      });

      for (const item of page.items) {
        yield this.getEntity(item[1]);
      }

      if (!page.hasNextPage) {
        break;
      }

      offset += 100;
  }
}
