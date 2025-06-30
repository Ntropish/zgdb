import { BlockManager } from "./block-store.js";
import { Configuration } from "./configuration.js";
import {
  createNodeProxy,
  InternalNodeProxy,
  LeafNodeProxy,
  NodeProxy,
  createLeafNodeBuffer,
  KeyValuePair,
  createInternalNodeBuffer,
  Branch,
  Address,
  isLeafNodeProxy,
} from "./node-proxy.js";
import { nodeChunker } from "./node-chunking.js";

export class NodeManager {
  constructor(
    public readonly blockManager: BlockManager,
    public readonly config: Configuration
  ) {}

  async getNode(
    address: Address
  ): Promise<LeafNodeProxy | InternalNodeProxy | undefined> {
    const bytes = await this.blockManager.get(address);
    if (!bytes) return undefined;
    return createNodeProxy(bytes, this);
  }

  getNodeSync(address: Address): LeafNodeProxy | InternalNodeProxy | undefined {
    const bytes = this.blockManager.getSync(address);
    if (!bytes) {
      return undefined;
    }
    return createNodeProxy(bytes, this);
  }

  isNodeFull(node: NodeProxy): boolean {
    const fanout = this.config.treeDefinition.targetFanout;
    return node.isLeaf()
      ? (node as LeafNodeProxy).length >= fanout
      : (node as InternalNodeProxy).length >= fanout;
  }

  async createLeafNode(
    pairs: KeyValuePair[]
  ): Promise<{ address: Address; node: LeafNodeProxy }> {
    pairs.sort((a, b) => this.config.comparator(a.key, b.key));
    const bytes = createLeafNodeBuffer(pairs, 0, pairs.length);
    const address = await this.blockManager.put(bytes);
    const node = new LeafNodeProxy(bytes, this);
    return { address, node };
  }

  async createInternalNode(
    branches: Branch[]
  ): Promise<{ address: Address; node: InternalNodeProxy }> {
    let totalSubtreeEntries = 0;
    let level = -1;
    for (const branch of branches) {
      const child = await this.getNode(branch.address);
      if (child) {
        totalSubtreeEntries += child.entryCount;
        if (level === -1) level = child.level + 1;
      }
    }
    if (level === -1) level = 1;

    const bytes = createInternalNodeBuffer(
      branches,
      level,
      totalSubtreeEntries
    );
    const address = await this.blockManager.put(bytes);
    const node = new InternalNodeProxy(bytes, this);
    return { address, node };
  }

  async updateChild(
    parent: InternalNodeProxy,
    oldChildAddress: Address,
    newBranches: Branch[]
  ): Promise<{ newAddress: Address; newBranches?: Branch[] }> {
    const branches = Array.from({ length: parent.length }, (_, i) =>
      parent.getBranch(i)
    );

    const childIndex = branches.findIndex(
      (branch) => this.config.comparator(branch.address, oldChildAddress) === 0
    );
    if (childIndex === -1)
      throw new Error("Could not find child address in parent");

    branches.splice(childIndex, 1, ...newBranches);

    const newParentChunks = await nodeChunker(branches, this.config);

    if (newParentChunks.length === 1) {
      const { address } = await this.createInternalNode(
        newParentChunks[0] as Branch[]
      );
      return { newAddress: address };
    } else {
      const newParentBranches: Branch[] = [];
      for (const chunk of newParentChunks) {
        const branchChunk = chunk as Branch[];
        const { address: newChunkAddress } = await this.createInternalNode(
          branchChunk
        );
        newParentBranches.push({
          key: branchChunk[branchChunk.length - 1].key,
          address: newChunkAddress,
        });
      }
      return {
        newAddress: newParentBranches[0].address,
        newBranches: newParentBranches,
      };
    }
  }

  async splitNode(node: LeafNodeProxy | InternalNodeProxy): Promise<Branch[]> {
    const newBranches: Branch[] = [];

    if (isLeafNodeProxy(node)) {
      const items: KeyValuePair[] = [];
      for (let i = 0; i < node.length; i++) {
        items.push(node.getPair(i));
      }
      const chunks = await nodeChunker(items, this.config);
      for (const chunk of chunks) {
        const { address: newChunkAddress } = await this.createLeafNode(chunk);
        newBranches.push({
          key: chunk[chunk.length - 1].key,
          address: newChunkAddress,
        });
      }
    } else {
      // It's an InternalNodeProxy
      const items: Branch[] = [];
      for (let i = 0; i < node.length; i++) {
        items.push(node.getBranch(i));
      }
      const chunks = await nodeChunker(items, this.config);
      for (const chunk of chunks) {
        const { address: newChunkAddress } = await this.createInternalNode(
          chunk
        );
        newBranches.push({
          key: chunk[chunk.length - 1].key,
          address: newChunkAddress,
        });
      }
    }
    return newBranches;
  }

  async _put(
    node: LeafNodeProxy,
    key: Uint8Array,
    value: Uint8Array
  ): Promise<{ newAddress: Address; newBranches?: Branch[] }> {
    const pairs: KeyValuePair[] = [];
    for (let i = 0; i < node.length; i++) {
      pairs.push(node.getPair(i));
    }
    const { found, index } = node.findKeyIndex(key);

    if (found) {
      if (this.config.comparator(pairs[index].value, value) === 0) {
        const originalAddress = await this.blockManager.hashFn(node.bytes);
        return { newAddress: originalAddress };
      }
      pairs[index] = { key, value };
    } else {
      pairs.splice(index, 0, { key, value });
    }

    const chunks = await nodeChunker(pairs, this.config);

    if (chunks.length === 1) {
      const { address } = await this.createLeafNode(
        chunks[0] as KeyValuePair[]
      );
      return { newAddress: address };
    } else {
      const newBranches: Branch[] = [];
      for (const chunk of chunks) {
        const pairChunk = chunk as KeyValuePair[];
        const { address: newChunkAddress } = await this.createLeafNode(
          pairChunk
        );
        newBranches.push({
          key: pairChunk[pairChunk.length - 1].key,
          address: newChunkAddress,
        });
      }
      return { newAddress: newBranches[0].address, newBranches: newBranches };
    }
  }
}
