# Prolly Tree Re-architecture Plan

## 1. Introduction

The goal is to build a robust, performant, and maintainable Prolly Tree implementation. Our previous iterative development highlighted several challenges and key architectural requirements. This document outlines a new, structured approach based on those learnings. The new design will be built upon a clear, layered architecture and developed with a test-first methodology.

## 2. Core Principles

The new implementation will adhere to the following principles:

1.  **Stateful Tree Manager**: The primary `ProllyTree` class will be a stateful manager. It will represent the head of a "branch," where write operations like `put` and `delete` modify the tree's internal state (specifically, its root address) directly, rather than returning a new tree instance.

2.  **Content-Defined Chunking**: We will strictly adhere to the Prolly Tree algorithm. Node splitting will be governed by a rolling hash (content-defined chunking) to determine split points probabilistically. This replaces the incorrect B-tree logic of splitting when a node is full.

3.  **Asynchronous Writes, Synchronous Reads**: All write operations (`put`, `delete`) that modify the tree and may require I/O will be `async`. All read operations (`get`, `scan`) will be `sync`, traversing the existing tree structure in memory.

4.  **Layered Architecture**: Responsibilities will be clearly segregated into layers:

    - `ProllyTree`: The high-level, public-facing API. Manages the tree's root and state.
    - `NodeManager`: The internal engine. Handles the recursive `put` logic, tree traversal, and directs node creation and modification.
    - `NodeChunker`: A pure utility responsible for implementing the content-defined chunking algorithm.
    - `NodeProxy`: A data access layer that provides a clean, object-oriented API over the raw FlatBuffers `ByteBuffer` for a node.
    - `BlockStore`: The persistence layer interface for storing and retrieving node blocks by their content address.

5.  **FlatBuffers as the Source of Truth**: The FlatBuffers schema (`node.fbs`) is the definitive source of truth for the node data structure. All data access logic in the `NodeProxy` will be built to align with this schema precisely.

## 3. Component Implementation Plan

Development will proceed in a bottom-up fashion, starting with the schema and moving up through the layers.

### Step 1: `schema/node.fbs` (The Foundation)

- **Action**: Finalize a correct and stable FlatBuffers schema.
- **Details**:
  - Define `KeyValuePair` for leaf nodes.
  - Define `Branch` (`key`, `address`) for internal nodes.
  - Define `LeafNode` containing a vector of `KeyValuePair`s.
  - Define `InternalNode` containing a vector of `Branch`es.
  - Use a `union NodeBody { LeafNode, InternalNode }`.
  - Define the root `table Node { body: NodeBody }`. This correctly encapsulates the union.

### Step 2: `src/block-store.ts` (Persistence)

- **Action**: Define the `BlockStore` interface and provide a testing implementation.
- **Details**:
  - `interface BlockStore { get(address): Promise<ByteBuffer>; put(bytes): Promise<address>; }`
  - Create `MemoryBlockStore` for use in all tests. This is largely complete.

### Step 3: `src/node-proxy.ts` (Data Access)

- **Action**: Implement a robust `NodeProxy` to abstract FlatBuffers complexities.
- **Details**:
  - The constructor will take a `ByteBuffer`.
  - Provide getters like `.isLeaf()`, `.level`, `.keys`, `.values`, `.entries`, `.branches`.
  - Provide static builder methods to create new nodes. This is critical for clean code in the `NodeManager`.
    - `static createLeafNode(entries): ByteBuffer`
    - `static createInternalNode(branches): ByteBuffer`

### Step 4: `src/node-chunking.ts` (Splitting Logic)

- **Action**: Create a focused `NodeChunker` utility.
- **Details**:
  - Implement a rolling hash algorithm (e.g., Buzhash).
  - The main function will take a list of items (either `KeyValuePair`s or `Branch`es) and the chunking configuration.
  - It will return an array of arrays, e.g., `[[item1, item2], [item3, item4, item5]]`, where each inner array represents the content for a new node.

### Step 5: `src/node-manager.ts` (The Engine)

- **Action**: Implement the recursive modification logic of the tree.
- **Details**: The core method is `async _put(nodeAddress, key, value)`.
  - **Base Case (Leaf Node):**
    1.  Fetch and proxy the node.
    2.  Create a new list of entries with the key/value pair inserted.
    3.  Pass the list to the `NodeChunker`.
    4.  For each chunk returned by the chunker, create a new node using `NodeProxy.createLeafNode`, save it to the `BlockStore`, and collect the resulting `Branch` (`{key, address}`).
    5.  Return the list of new `Branch`es.
  - **Recursive Step (Internal Node):**
    1.  Fetch and proxy the node.
    2.  Find the correct child to descend into.
    3.  `const newChildBranches = await this._put(child.address, key, value)`.
    4.  Create a new list of branches for the current node, replacing the single old child branch with the `newChildBranches`.
    5.  Pass this new list of branches to the `NodeChunker`.
    6.  Create, store, and collect `Branch`es for any new internal nodes resulting from a split.
    7.  Return the list of new `Branch`es.

### Step 6: `src/prolly-tree.ts` (Public API)

- **Action**: Implement the top-level stateful class.
- **Details**:
  - The class will hold `private rootAddress` and an instance of `NodeManager`.
  - `async put(key, value)`:
    1.  `const newBranches = await this.nodeManager._put(this.rootAddress, key, value)`.
    2.  Check if the root was split (i.e., `newBranches.length > 1`).
    3.  If it was, create a new root node (`NodeProxy.createInternalNode(newBranches)`), store it, and update `this.rootAddress` to the new root's address.
    4.  If it was not split (`newBranches.length === 1`), simply update `this.rootAddress` to `newBranches[0].address`.

## 4. Testing Strategy

A test-driven approach is mandatory. Tests will be written for each component before moving to the next layer.

1.  **Unit Tests (Bottom-up):**
    - `node-proxy.test.ts`: Test creation and all data accessors.
    - `node-chunker.test.ts`: Verify chunking logic against known inputs.
    - `node-manager.test.ts`: Test the `_put` logic on isolated leaf and internal nodes to verify splitting and propagation.
2.  **Integration Tests:**
    - `prolly-tree.test.ts`: Test the public `put`/`get` API and state management of the `rootAddress`.
    - `simple-split.test.ts`: A minimal test to verify the first leaf-to-internal split.
    - `cascading-splits.test.ts`: Force splits that propagate up multiple levels of the tree.
    - `mass-inserts.test.ts`: The "Librarian of Babel" test to ensure stability and performance under heavy load.

## 5. Debugging

The `tree.print()` utility that outputs a clean JSON representation of the tree structure was invaluable. It will be maintained and enhanced as a primary tool for debugging and visualizing the tree's state during tests.
