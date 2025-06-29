import { ByteBuffer, Builder } from "flatbuffers";
import {
  Node as FlatbufferNode,
  LeafNode as FlatbufferLeafNode,
  InternalNode as FlatbufferInternalNode,
  KeyValuePair as FlatbufferKeyValuePair,
  Branch as FlatbufferBranch,
  NodeBody,
} from "./generated/zgdb/prolly-tree.js";
import type { NodeManager } from "./node-manager.js";

export type Address = Uint8Array;
export type KeyValuePair = { key: Uint8Array; value: Uint8Array };
export type Branch = { key: Uint8Array; address: Address };

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

  get entryCount(): number {
    return this.node.entryCount();
  }

  get bytes(): Uint8Array {
    return this.node.bb!.bytes();
  }

  isLeaf(): this is LeafNodeProxy {
    return this.node.bodyType() === NodeBody.LeafNode;
  }
}

export class LeafNodeProxy extends NodeProxy {
  private readonly leaf: FlatbufferLeafNode;

  constructor(bytes: Uint8Array, nodeManager: NodeManager) {
    super(bytes, nodeManager);
    this.leaf = this.node.body(new FlatbufferLeafNode())! as FlatbufferLeafNode;
  }

  get length(): number {
    return this.leaf.pairsLength();
  }

  getPair(index: number): KeyValuePair {
    const pair = this.leaf.pairs(index)!;
    return { key: pair.keyArray()!, value: pair.valueArray()! };
  }

  findKeyIndex(key: Uint8Array): { found: boolean; index: number } {
    let low = 0;
    let high = this.length - 1;
    while (low <= high) {
      const mid = low + Math.floor((high - low) / 2);
      const midKey = this.getPair(mid).key;
      const cmp = this.nodeManager.config.comparator(key, midKey);
      if (cmp > 0) low = mid + 1;
      else if (cmp < 0) high = mid - 1;
      else return { found: true, index: mid };
    }
    return { found: false, index: low };
  }
}

export class InternalNodeProxy extends NodeProxy {
  private readonly internal: FlatbufferInternalNode;

  constructor(bytes: Uint8Array, nodeManager: NodeManager) {
    super(bytes, nodeManager);
    this.internal = this.node.body(
      new FlatbufferInternalNode()
    )! as FlatbufferInternalNode;
  }

  get length(): number {
    return this.internal.branchesLength();
  }

  getBranch(index: number): Branch {
    const branch = this.internal.branches(index)!;
    return { key: branch.keyArray()!, address: branch.addressArray()! };
  }

  findChildIndex(key: Uint8Array): number {
    let low = 0;
    let high = this.length - 1;
    let result = this.length;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midKey = this.getBranch(mid).key;
      const cmp = this.nodeManager.config.comparator(key, midKey);
      if (cmp < 0) {
        result = mid;
        high = mid - 1;
      } else if (cmp > 0) {
        low = mid + 1;
      } else {
        // cmp === 0, exact match
        return mid;
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
  const buf = new ByteBuffer(bytes);
  const node = FlatbufferNode.getRootAsNode(buf);
  const bodyType = node.bodyType();

  if (bodyType === NodeBody.LeafNode) {
    return new LeafNodeProxy(bytes, nodeManager);
  } else if (bodyType === NodeBody.InternalNode) {
    return new InternalNodeProxy(bytes, nodeManager);
  } else {
    throw new Error("Invalid node type");
  }
}

/**
 * Type guard to check if a NodeProxy is a LeafNodeProxy.
 */
export function isLeafNodeProxy(proxy: NodeProxy): proxy is LeafNodeProxy {
  return proxy.isLeaf();
}

// #region Node Creation Utilities

export function createLeafNodeBuffer(
  pairs: KeyValuePair[],
  level: number,
  entryCount: number
): Uint8Array {
  const builder = new Builder(1024);
  const pairOffsets = pairs.map((p) => {
    const key = builder.createSharedString(p.key);
    const value = builder.createSharedString(p.value);
    FlatbufferKeyValuePair.startKeyValuePair(builder);
    FlatbufferKeyValuePair.addKey(builder, key);
    FlatbufferKeyValuePair.addValue(builder, value);
    return FlatbufferKeyValuePair.endKeyValuePair(builder);
  });

  const pairsVector = FlatbufferLeafNode.createPairsVector(
    builder,
    pairOffsets
  );
  FlatbufferLeafNode.startLeafNode(builder);
  FlatbufferLeafNode.addPairs(builder, pairsVector);
  const leafNodeOffset = FlatbufferLeafNode.endLeafNode(builder);

  FlatbufferNode.startNode(builder);
  FlatbufferNode.addLevel(builder, level);
  FlatbufferNode.addEntryCount(builder, entryCount);
  FlatbufferNode.addBodyType(builder, NodeBody.LeafNode);
  FlatbufferNode.addBody(builder, leafNodeOffset);
  const nodeOffset = FlatbufferNode.endNode(builder);

  builder.finish(nodeOffset);
  return builder.asUint8Array();
}

export function createInternalNodeBuffer(
  branches: Branch[],
  level: number,
  entryCount: number
): Uint8Array {
  const builder = new Builder(1024);
  const branchOffsets = branches.map((b) => {
    const key = builder.createSharedString(b.key);
    const address = builder.createSharedString(b.address);
    FlatbufferBranch.startBranch(builder);
    FlatbufferBranch.addKey(builder, key);
    FlatbufferBranch.addAddress(builder, address);
    return FlatbufferBranch.endBranch(builder);
  });

  const branchesVector = FlatbufferInternalNode.createBranchesVector(
    builder,
    branchOffsets
  );
  FlatbufferInternalNode.startInternalNode(builder);
  FlatbufferInternalNode.addBranches(builder, branchesVector);
  const internalNodeOffset = FlatbufferInternalNode.endInternalNode(builder);

  FlatbufferNode.startNode(builder);
  FlatbufferNode.addLevel(builder, level);
  FlatbufferNode.addEntryCount(builder, entryCount);
  FlatbufferNode.addBodyType(builder, NodeBody.InternalNode);
  FlatbufferNode.addBody(builder, internalNodeOffset);
  const nodeOffset = FlatbufferNode.endNode(builder);

  builder.finish(nodeOffset);
  return builder.asUint8Array();
}

// #endregion
