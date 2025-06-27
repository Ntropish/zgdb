# @tk/prolly-tree

A TypeScript implementation of a Prolly Tree (Probabilistic B-Tree), a content-addressed data structure that provides history-independent, verifiable storage for key-value data.

This structure is ideal for applications requiring verifiable, tamper-proof data storage, such as decentralized databases, version control systems, and secure logs.

## Features

- **Content-Addressable:** Each node in the tree is identified by the hash of its content, making the entire structure self-verifying.
- **History-Independent:** The final state of the tree (and its root hash) is identical regardless of the order in which data is inserted. Two users with the same dataset will always produce the exact same tree.
- **Efficient Storage:** Uses content-defined chunking to efficiently store and update large values.
- **Fast Lookups:** Logarithmic time complexity for gets, puts, and deletes.

## Installation

```sh
pnpm install @tk/prolly-tree
```

## API Design Proposal

The primary interface for the library is the `ProllyTree` class.

### Creating and Loading a Tree

A tree is always associated with a `BlockManager` for handling the underlying storage of nodes.

#### `ProllyTree.create(blockManager)`

Creates a new, empty Prolly Tree.

**Arguments:**

- `blockManager`: An instance of `BlockManager`. The tree will use the configuration associated with this manager.

**Returns:** `Promise<ProllyTree>`

**Example:**

```typescript
import { ProllyTree } from "@tk/prolly-tree";
import { BlockManager } from "@tk/prolly-tree";

// The BlockManager will merge this partial config with the default configuration.
const config = {
  hashingAlgorithm: "sha2-256",
};

const blockManager = new BlockManager(config);
const tree = await ProllyTree.create(blockManager);
```

#### `ProllyTree.load(rootAddress, blockManager)`

Loads an existing tree from a known root address.

**Arguments:**

- `rootAddress`: The `Address` (hash) of the tree's root node.
- `blockManager`: An instance of `BlockManager`. The configuration of this manager **must** be compatible with the configuration used to create the tree.

**Returns:** `Promise<ProllyTree>`

**Example:**

```typescript
const knownRootAddress = // ... get a root hash from somewhere
const tree = await ProllyTree.load(knownRootAddress, blockManager);
```

### Reading and Writing Data

Once you have a `ProllyTree` instance, you can `get` and `put` key-value pairs. All keys and values are `Uint8Array`.

The `put` operation is immutable. It does not change the existing tree instance but instead returns a **new** `ProllyTree` instance representing the state of the tree after the insertion.

#### `tree.put(key, value)`

Inserts a key-value pair into the tree.

**Returns:** `Promise<{ tree: ProllyTree; changed: boolean }>` - An object containing the new tree instance and a boolean indicating if the operation resulted in a change.

**Example:**

```typescript
import { fromString } from "uint8arrays/from-string";

const key = fromString("hello");
const value = fromString("world");

const { tree: newTree, changed } = await tree.put(key, value);

console.log(`Tree was changed: ${changed}`);

// The original tree instance is unchanged
console.log("Original root:", tree.root);
console.log("New root:     ", newTree.root);
```

#### `tree.get(key)`

Retrieves the value associated with a key.

**Returns:** `Promise<Uint8Array | undefined>` - The value if the key exists, otherwise `undefined`.

**Example:**

```typescript
const value = await newTree.get(key);
if (value) {
  console.log(new TextDecoder().decode(value)); // "world"
}
```

#### `tree.root`

A getter property that returns the `Address` (hash) of the current root node of the tree. This address is the single identifier for the tree's entire state and can be used with `ProllyTree.load` to reconstruct it later.

**Returns:** `Address`

**Example:**

```typescript
const rootHash = newTree.root;
// You can now store or transmit this rootHash
```
