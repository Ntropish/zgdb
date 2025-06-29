import { ByteBuffer } from "flatbuffers";
import {
  Node as FlatbufferNode,
  LeafNode as FlatbufferLeafNode,
  InternalNode as FlatbufferInternalNode,
} from "./generated/zgdb/prolly-tree.js";
import { Address } from "./node.js";

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
