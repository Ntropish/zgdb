# Block Store Package - Product Requirements Document (PRD)

## 1. Overview

This document outlines the requirements for a new package, `@zgdb/block-store`. This package will provide a generic, content-addressable block storage system. It will serve as a foundational component for other parts of the `zgdb` ecosystem, such as the Prolly Tree implementation. The primary goal is to abstract the underlying storage mechanism, allowing developers to easily switch between different storage backends (e.g., in-memory for testing, persistent for production) without changing the application logic.

## 2. Core Problem

Complex data structures like Prolly Trees and CRDTs require a reliable way to store and retrieve chunks of data (blocks) by their content-based hash (address). Application logic should not be concerned with the specifics of how this data is persisted. It needs a simple, consistent API to `put` and `get` blocks. Our Prolly Tree implementation requires such a system, and building it as a separate, generic package will improve modularity, testability, and reusability.

## 3. Key Features & Requirements

### 3.1. Content-Addressability

- The store's primary function is to save a block of data (as a `Uint8Array`) and generate an address for it.
- The address will be calculated by hashing the content of the block using a configurable hashing algorithm (defaulting to SHA-256).
- The `put` operation will return the calculated address.
- The `get` operation will retrieve the original block using its address.

### 3.2. Generic `BlockStore` Interface

A core `interface BlockStore` will define the API contract that all specific implementations must adhere to.

```typescript
export type Address = Uint8Array;

export interface BlockStore {
  /**
   * Retrieves a block of data from the store.
   * @param address The content address of the block.
   * @returns A Promise that resolves to the block's data as a Uint8Array, or undefined if not found.
   */
  get(address: Address): Promise<Uint8Array | undefined>;

  /**
   * Stores a block of data.
   * @param block The block data to store.
   * @returns A Promise that resolves to the content address of the stored block.
   */
  put(block: Uint8Array): Promise<Address>;

  /**
   * Checks for the existence of a block.
   * @param address The content address of the block.
   * @returns A Promise that resolves to true if the block exists, false otherwise.
   */
  has(address: Address): Promise<boolean>;
}
```

### 3.3. Initial Implementations

The package will ship with two initial implementations:

1.  **`MemoryBlockStore`**:

    - An in-memory implementation for synchronous, fast access.
    - Primarily intended for testing, short-lived scripts, and scenarios where persistence is not required.
    - Its state is ephemeral and lost when the process ends.

2.  **`IndexedDBBlockStore`**:
    - A browser-based persistent storage implementation.
    - Uses the browser's IndexedDB API to store blocks.
    - Requires a `name` for the database to allow multiple stores to coexist on the same origin.
    - This will be the standard store for client-side applications.

### 3.4. Hashing Abstraction

- The hashing mechanism will be pluggable.
- A `Hasher` interface will be defined:
  ```typescript
  export interface Hasher {
    (data: Uint8Array): Promise<Address>;
  }
  ```
- A default `sha256` hasher will be provided.
- Users can provide their own `Hasher` implementation during the `BlockStore`'s construction if needed.

## 4. API Design & Usage Example

```typescript
import { MemoryBlockStore, IndexedDBBlockStore } from "@zgdb/block-store";
import { sha256 } from "@zgdb/block-store/hashers";

// --- In-memory example (Node.js/Testing) ---
async function memoryExample() {
  const store = new MemoryBlockStore();
  const data = new TextEncoder().encode("Hello, World!");

  const address = await store.put(data);
  console.log("Stored address:", address);

  const retrieved = await store.get(address);
  console.log("Retrieved data:", new TextDecoder().decode(retrieved));
}

// --- IndexedDB example (Browser) ---
async function browserExample() {
  const store = new IndexedDBBlockStore("my-app-db");
  await store.open(); // IndexedDB requires an async initialization step

  const data = new TextEncoder().encode("Hello, Browser!");
  const address = await store.put(data);

  const exists = await store.has(address);
  console.log("Block exists:", exists);

  await store.close();
}
```

## 5. Non-Goals

- **Data Encryption**: The block store will not handle encryption at rest. This is a higher-level concern that can be implemented on top of the store if needed.
- **Networked Block Store**: A block store that syncs over a network (e.g., via libp2p) is out of scope for the initial version but is a potential future enhancement.
- **Data-sharding or replication**: These are complex features that are not part of the core requirement of a simple block store.

## 6. Testing Plan

As requested, planning will be done via tests. We will create a comprehensive test suite that any `BlockStore` implementation can be validated against.

- `block-store.test.ts`: A generic test suite that takes a `BlockStore` factory.
  - It will test the full `get`/`put`/`has` lifecycle.
  - It will test edge cases like putting duplicate content (should return the same address), getting a non-existent block, etc.
- `memory-block-store.test.ts`: A specific test runner for the `MemoryBlockStore` using the generic suite.
- `indexed-db-block-store.test.ts`: A specific test runner for the `IndexedDBBlockStore`. This will require a browser-like environment (e.g., Vitest's `happy-dom` or `jsdom`).
