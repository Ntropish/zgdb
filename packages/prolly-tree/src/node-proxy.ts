import { ByteBuffer, Builder } from "flatbuffers";
import { compare } from "uint8arrays/compare";
import { toString } from "uint8arrays/to-string";
import {
  Node as FlatbufferNode,
  LeafNode as FlatbufferLeafNode,
  InternalNode as FlatbufferInternalNode,
  Key,
  Value,
  Address as FlatbufferAddress,
  NodeBody,
} from "./generated/zgdb/prolly-tree.js";
import type { NodeManager } from "./node-manager.js";

export type Address = Uint8Array;
export type KeyValuePair = { key: Uint8Array; value: Uint8Array };

/**
 * A proxy class for accessing FlatBuffer-based node data in a type-safe manner.
 * This provides a zero-copy read interface to the underlying buffer.
 */
export abstract class NodeProxy {
  public readonly node: FlatbufferNode;
  protected readonly nodeManager: NodeManager;

  constructor(bytes: Uint8Array, nodeManager: NodeManager) {
    const buf = new ByteBuffer(bytes);
    this.node = FlatbufferNode.getRootAsNode(buf);
    this.nodeManager = nodeManager;
  }

  get level(): number {
    return this.node.level();
  }

  isLeaf(): this is LeafNodeProxy {
    return this.level === 0;
  }

  isInternal(): this is InternalNodeProxy {
    return this.level > 0;
  }

  get entryCount(): number {
    return this.node.entryCount();
  }

  get bytes(): Uint8Array {
    if (!this.node.bb) {
      throw new Error("ByteBuffer not available");
    }
    return this.node.bb.bytes();
  }

  abstract getFirstKey(): Promise<Uint8Array | undefined>;
  abstract getFirstKeySync(): Uint8Array | undefined;

  asLeaf(): LeafNodeProxy {
    if (this.isLeaf()) {
      // The `this` is already a LeafNodeProxy, but TypeScript doesn't know that
      // without a type assertion. We can avoid creating a new instance.
      return this as unknown as LeafNodeProxy;
    }
    throw new Error("Cannot cast to LeafNodeProxy: Node is an internal node.");
  }

  asInternal(): InternalNodeProxy {
    if (this.isInternal()) {
      return this as unknown as InternalNodeProxy;
    }
    throw new Error("Cannot cast to InternalNodeProxy: Node is a leaf node.");
  }
}

export class LeafNodeProxy extends NodeProxy {
  public readonly leaf: FlatbufferLeafNode;

  constructor(bytes: Uint8Array, nodeManager: NodeManager) {
    super(bytes, nodeManager);
    const body = this.node.body(new FlatbufferLeafNode());
    if (!body) {
      throw new Error("Failed to access LeafNode body");
    }
    this.leaf = body;
  }

  get keysLength(): number {
    return this.leaf.keysLength();
  }

  getKey(index: number): Uint8Array | null {
    return this.leaf.keys(index)?.keyArray() ?? null;
  }

  getValue(index: number): Uint8Array | null {
    return this.leaf.values(index)?.valueArray() ?? null;
  }

  getPair(index: number): KeyValuePair {
    const key = this.getKey(index);
    const value = this.getValue(index);
    if (!key || !value) {
      throw new Error(`Entry at index ${index} not found.`);
    }
    return { key, value };
  }

  async getFirstKey(): Promise<Uint8Array | undefined> {
    return this.getFirstKeySync();
  }

  getFirstKeySync(): Uint8Array | undefined {
    if (this.keysLength === 0) {
      return undefined;
    }
    return this.getKey(0) ?? undefined;
  }

  /**
   * Performs a binary search to find the index of a key.
   * @returns The index of the key if found, otherwise the bitwise complement of the insertion point.
   */
  findKeyIndex(key: Uint8Array): { found: boolean; index: number } {
    let low = 0;
    let high = this.keysLength - 1;
    let mid = 0;

    while (low <= high) {
      mid = low + Math.floor((high - low) / 2);
      const midKey = this.getKey(mid);
      if (midKey === null) {
        // This indicates a sparse array or an issue with the data.
        // Depending on the expected structure, you might want to handle this differently.
        // For a dense array of keys, this case might be an error.
        // Let's assume keys are dense and this is an error condition or end of search.
        high = mid - 1; // Or handle as an error
        continue;
      }
      const cmp = this.nodeManager.config.comparator(key, midKey);

      if (cmp > 0) {
        low = mid + 1;
      } else if (cmp < 0) {
        high = mid - 1;
      } else {
        return { found: true, index: mid };
      }
    }

    return { found: false, index: low };
  }

  getAllPairs(): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    for (let i = 0; i < this.keysLength; i++) {
      pairs.push(this.getPair(i));
    }
    return pairs;
  }
}

export class InternalNodeProxy extends NodeProxy {
  private readonly internal: FlatbufferInternalNode;

  constructor(bytes: Uint8Array, nodeManager: NodeManager) {
    super(bytes, nodeManager);
    const body = this.node.body(new FlatbufferInternalNode());
    if (!body) {
      throw new Error("Failed to access InternalNode body");
    }
    this.internal = body;
  }

  get keysLength(): number {
    return this.internal.keysLength();
  }

  get addressesLength(): number {
    return this.internal.addressesLength();
  }

  async getFirstKey(): Promise<Uint8Array | undefined> {
    // The first key in the subtree of an internal node is the first key of its leftmost child.
    // This requires recursively descending to the first leaf.
    let childAddress = this.getAddress(0);
    if (!childAddress) return undefined;

    let childNode = await this.nodeManager.getNode(childAddress);
    if (!childNode) return undefined;

    return childNode.getFirstKey();
  }

  getFirstKeySync(): Uint8Array | undefined {
    // The first key in the subtree of an internal node is the first key of its leftmost child.
    // This requires recursively descending to the first leaf.
    let childAddress = this.getAddress(0);
    if (!childAddress) return undefined;

    let childNode = this.nodeManager.getNodeSync(childAddress);
    if (!childNode) return undefined; // Child not in cache

    return childNode.getFirstKeySync();
  }

  getKey(index: number): Uint8Array | null {
    return this.internal.keys(index)?.keyArray() ?? null;
  }

  getAddress(index: number): Address | null {
    return this.internal.addresses(index)?.addressArray() ?? null;
  }

  /**
   * Finds the index of the child pointer for the given key.
   * In an internal node, there are `k` keys and `k+1` child pointers.
   * The keys act as separators.
   *
   * Child 0: keys < key[0]
   * Child i: key[i-1] <= keys < key[i]
   * Child k: keys >= key[k-1]
   */
  findChildIndex(key: Uint8Array): number {
    // Correctly performs a binary search.
    let low = 0;
    let high = this.keysLength - 1;
    let result = this.keysLength; // Default to the rightmost child

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midKey = this.getKey(mid);

      if (!midKey) {
        // This case should not happen in a correctly formed node
        // but as a safeguard, we treat it as if we've gone past the end.
        high = mid - 1;
        continue;
      }

      const cmp = this.nodeManager.config.comparator(key, midKey);

      if (cmp < 0) {
        result = mid; // This might be the correct child index
        high = mid - 1;
      } else {
        // key >= midKey
        low = mid + 1;
      }
    }

    return result;
  }
}

/**
 * Creates a NodeProxy from a byte buffer.
 */
export function createNodeProxy(
  bytes: Uint8Array,
  nodeManager: NodeManager
): LeafNodeProxy | InternalNodeProxy {
  // Directly parse the buffer to check the level without full proxy instantiation.
  const buf = new ByteBuffer(bytes);
  const node = FlatbufferNode.getRootAsNode(buf);
  const level = node.level();

  if (level === 0) {
    return new LeafNodeProxy(bytes, nodeManager);
  } else {
    return new InternalNodeProxy(bytes, nodeManager);
  }
}

/**
 * Type guard to check if a NodeProxy is a LeafNodeProxy.
 */
export function isLeafNodeProxy(proxy: NodeProxy): proxy is LeafNodeProxy {
  return proxy.isLeaf();
}

// #region Node Creation Utilities

export type BranchPair = { key: Uint8Array; address: Uint8Array };

export function createLeafNodeBuffer(
  pairs: KeyValuePair[],
  level: number
): Uint8Array {
  const builder = new Builder(1024);

  const keyOffsets = pairs.map((pair) => {
    const keyVec = Key.createKeyVector(builder, pair.key);
    Key.startKey(builder);
    Key.addKey(builder, keyVec);
    return Key.endKey(builder);
  });
  const valueOffsets = pairs.map((pair) => {
    const valVec = Value.createValueVector(builder, pair.value);
    Value.startValue(builder);
    Value.addValue(builder, valVec);
    return Value.endValue(builder);
  });

  const keysVector = FlatbufferLeafNode.createKeysVector(builder, keyOffsets);
  const valuesVector = FlatbufferLeafNode.createValuesVector(
    builder,
    valueOffsets
  );

  FlatbufferLeafNode.startLeafNode(builder);
  FlatbufferLeafNode.addKeys(builder, keysVector);
  FlatbufferLeafNode.addValues(builder, valuesVector);
  const leafNodeOffset = FlatbufferLeafNode.endLeafNode(builder);

  FlatbufferNode.startNode(builder);
  FlatbufferNode.addEntryCount(builder, pairs.length);
  FlatbufferNode.addLevel(builder, level);
  FlatbufferNode.addBodyType(builder, NodeBody.LeafNode);
  FlatbufferNode.addBody(builder, leafNodeOffset);
  const nodeOffset = FlatbufferNode.endNode(builder);

  builder.finish(nodeOffset);
  return builder.asUint8Array();
}

export function createInternalNodeBuffer(
  branches: BranchPair[],
  totalSubtreeEntries: number,
  level: number
): Uint8Array {
  const builder = new Builder(1024);

  const keyOffsets = branches
    .filter((branch) => branch.key.length > 0)
    .map((branch) => {
      const keyVec = Key.createKeyVector(builder, branch.key);
      Key.startKey(builder);
      Key.addKey(builder, keyVec);
      return Key.endKey(builder);
    });

  const addressOffsets = branches.map((branch) => {
    const addrVec = FlatbufferAddress.createAddressVector(
      builder,
      branch.address
    );
    FlatbufferAddress.startAddress(builder);
    FlatbufferAddress.addAddress(builder, addrVec);
    return FlatbufferAddress.endAddress(builder);
  });

  const keysVector = FlatbufferInternalNode.createKeysVector(
    builder,
    keyOffsets
  );
  const addressesVector = FlatbufferInternalNode.createAddressesVector(
    builder,
    addressOffsets
  );

  FlatbufferInternalNode.startInternalNode(builder);
  FlatbufferInternalNode.addKeys(builder, keysVector);
  FlatbufferInternalNode.addAddresses(builder, addressesVector);
  const internalNodeOffset = FlatbufferInternalNode.endInternalNode(builder);

  FlatbufferNode.startNode(builder);
  FlatbufferNode.addEntryCount(builder, totalSubtreeEntries);
  FlatbufferNode.addLevel(builder, level);
  FlatbufferNode.addBodyType(builder, NodeBody.InternalNode);
  FlatbufferNode.addBody(builder, internalNodeOffset);
  const nodeOffset = FlatbufferNode.endNode(builder);

  builder.finish(nodeOffset);
  return builder.asUint8Array();
}

// #endregion
