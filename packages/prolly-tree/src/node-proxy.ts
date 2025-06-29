import { ByteBuffer, Builder } from "flatbuffers";
import { compare } from "uint8arrays/compare";
import {
  Node as FlatbufferNode,
  LeafNode as FlatbufferLeafNode,
  InternalNode as FlatbufferInternalNode,
  Entry,
  Branch,
  NodeBody,
} from "./generated/zgdb/prolly-tree.js";

export type Address = Uint8Array;

/**
 * A proxy class for accessing FlatBuffer-based node data in a type-safe manner.
 * This provides a zero-copy read interface to the underlying buffer.
 */
export abstract class NodeProxy {
  protected readonly node: FlatbufferNode;

  constructor(bytes: Uint8Array) {
    const buf = new ByteBuffer(bytes);
    this.node = FlatbufferNode.getRootAsNode(buf);
  }

  get entryCount(): number {
    return this.node.entryCount();
  }

  get isLeaf(): boolean {
    return this.node.isLeaf();
  }

  get bytes(): Uint8Array {
    if (!this.node.bb) {
      throw new Error("ByteBuffer not available");
    }
    return this.node.bb.bytes();
  }
}

export class LeafNodeProxy extends NodeProxy {
  private readonly leaf: FlatbufferLeafNode;

  constructor(bytes: Uint8Array) {
    super(bytes);
    const body = this.node.body(new FlatbufferLeafNode());
    if (!body) {
      throw new Error("Failed to access LeafNode body");
    }
    this.leaf = body;
  }

  get numEntries(): number {
    return this.leaf.entriesLength();
  }

  getEntry(index: number): { key: Address; value: Uint8Array } {
    const entry = this.leaf.entries(index);
    if (!entry) {
      throw new Error(`Entry at index ${index} not found.`);
    }
    const key = entry.keyArray();
    const value = entry.valueArray();
    if (!key || !value) {
      throw new Error("Malformed entry data.");
    }
    return { key, value };
  }

  /**
   * Performs a binary search to find the index of an entry by its key.
   * @returns The index of the entry if found, otherwise a negative number.
   */
  findEntryIndex(key: Uint8Array): number {
    let low = 0;
    let high = this.numEntries - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const entry = this.leaf.entries(mid); // Direct access
      if (!entry) throw new Error("Malformed node: missing entry");
      const midKey = entry.keyArray();
      if (!midKey) throw new Error("Malformed entry: missing key");

      const cmp = compare(midKey, key);

      if (cmp < 0) {
        low = mid + 1;
      } else if (cmp > 0) {
        high = mid - 1;
      } else {
        return mid; // Key found
      }
    }

    return -(low + 1); // Key not found, returns insertion point
  }

  getEntries(): KeyValuePair[] {
    const pairs: KeyValuePair[] = [];
    for (let i = 0; i < this.numEntries; i++) {
      pairs.push(this.getEntry(i));
    }
    return pairs;
  }
}

export class InternalNodeProxy extends NodeProxy {
  private readonly internal: FlatbufferInternalNode;
  constructor(bytes: Uint8Array) {
    super(bytes);
    const body = this.node.body(new FlatbufferInternalNode());
    if (!body) {
      throw new Error("Failed to access InternalNode body");
    }
    this.internal = body;
  }

  get numBranches(): number {
    return this.internal.branchesLength();
  }

  getBranch(index: number): { key: Address; address: Address } {
    const branch = this.internal.branches(index);
    if (!branch) {
      throw new Error(`Branch at index ${index} not found.`);
    }
    const key = branch.keyArray();
    const address = branch.addressArray();
    if (!key || !address) {
      throw new Error("Malformed branch data.");
    }
    return { key, address };
  }

  findChildIndex(key: Uint8Array): number {
    let low = 0;
    let high = this.numBranches - 1;
    let childIndex = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const branch = this.internal.branches(mid);
      if (!branch) throw new Error("Malformed node: missing branch");
      const midKey = branch.keyArray();
      if (!midKey) throw new Error("Malformed branch: missing key");

      const cmp = compare(key, midKey);

      if (cmp <= 0) {
        childIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return childIndex === -1 ? this.numBranches - 1 : childIndex;
  }

  getBranches(): BranchPair[] {
    const branches: BranchPair[] = [];
    for (let i = 0; i < this.numBranches; i++) {
      branches.push(this.getBranch(i));
    }
    return branches;
  }
}

/**
 * Creates a NodeProxy from a byte buffer.
 */
export function createNodeProxy(
  bytes: Uint8Array
): LeafNodeProxy | InternalNodeProxy {
  const buf = new ByteBuffer(bytes);
  const node = FlatbufferNode.getRootAsNode(buf);
  if (node.isLeaf()) {
    return new LeafNodeProxy(bytes);
  } else {
    return new InternalNodeProxy(bytes);
  }
}

/**
 * Type guard to check if a NodeProxy is a LeafNodeProxy.
 */
export function isLeafNodeProxy(proxy: NodeProxy): proxy is LeafNodeProxy {
  return proxy.isLeaf;
}

// #region Node Creation Utilities

export type KeyValuePair = { key: Uint8Array; value: Uint8Array };
export type BranchPair = { key: Uint8Array; address: Uint8Array };

export function createLeafNodeBuffer(pairs: KeyValuePair[]): Uint8Array {
  const builder = new Builder(1024);

  const entryOffsets = pairs.map((pair) => {
    const keyVectorOffset = Entry.createKeyVector(builder, pair.key);
    const valueVectorOffset = Entry.createValueVector(builder, pair.value);

    Entry.startEntry(builder);
    Entry.addKey(builder, keyVectorOffset);
    Entry.addValue(builder, valueVectorOffset);
    return Entry.endEntry(builder);
  });

  const entriesVector = FlatbufferLeafNode.createEntriesVector(
    builder,
    entryOffsets
  );

  FlatbufferLeafNode.startLeafNode(builder);
  FlatbufferLeafNode.addEntries(builder, entriesVector);
  const leafNodeOffset = FlatbufferLeafNode.endLeafNode(builder);

  FlatbufferNode.startNode(builder);
  FlatbufferNode.addIsLeaf(builder, true);
  FlatbufferNode.addEntryCount(builder, pairs.length);
  FlatbufferNode.addBodyType(builder, NodeBody.LeafNode);
  FlatbufferNode.addBody(builder, leafNodeOffset);
  const nodeOffset = FlatbufferNode.endNode(builder);

  builder.finish(nodeOffset);
  return builder.asUint8Array();
}

export function createInternalNodeBuffer(
  branches: BranchPair[],
  totalSubtreeEntries: number
): Uint8Array {
  const builder = new Builder(1024);

  const branchOffsets = branches.map((branch) => {
    const keyVectorOffset = Branch.createKeyVector(builder, branch.key);
    const addressVectorOffset = Branch.createAddressVector(
      builder,
      branch.address
    );

    Branch.startBranch(builder);
    Branch.addKey(builder, keyVectorOffset);
    Branch.addAddress(builder, addressVectorOffset);
    return Branch.endBranch(builder);
  });

  const branchesVector = FlatbufferInternalNode.createBranchesVector(
    builder,
    branchOffsets
  );

  FlatbufferInternalNode.startInternalNode(builder);
  FlatbufferInternalNode.addBranches(builder, branchesVector);
  const internalNodeOffset = FlatbufferInternalNode.endInternalNode(builder);

  FlatbufferNode.startNode(builder);
  FlatbufferNode.addIsLeaf(builder, false);
  FlatbufferNode.addEntryCount(builder, totalSubtreeEntries);
  FlatbufferNode.addBodyType(builder, NodeBody.InternalNode);
  FlatbufferNode.addBody(builder, internalNodeOffset);
  const nodeOffset = FlatbufferNode.endNode(builder);

  builder.finish(nodeOffset);
  return builder.asUint8Array();
}

// #endregion
