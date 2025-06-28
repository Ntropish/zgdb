# ZG: A Schema-Driven, Decentralized Graph Database

## 1. Mission Statement

Our mission is to create **ZG**, a next-generation graph database designed for modern, decentralized applications. ZG empowers developers to build real-time, collaborative, and offline-first applications with the safety and productivity of a strongly-typed, schema-driven workflow. By combining a powerful code generation pipeline with a uniquely ergonomic client API, ZG provides a seamless developer experience for building complex, peer-to-peer systems.

## 2. Core Philosophy

- **Developer Experience First:** A declarative, TypeScript-native schema should be simple and intuitive. The database client should feel like a synchronous, in-memory object graph, abstracting away the complexities of persistence and serialization.
- **Type-Safety End-to-End:** Leverage code generation to provide full type-safety from the database schema to the application layer, eliminating a common class of errors.
- **Decentralization at the Core:** Build on a foundation of decentralized identity (DIDs), authorization (UCANs), and data replication (CRDTs) to enable true peer-to-peer and serverless architectures.
- **Performance & Efficiency:** Utilize high-performance serialization formats (Flatbuffers) and advanced data structures (Prolly Trees) to ensure minimal latency and efficient data synchronization.

## 3. Architecture Overview

The ZG ecosystem is composed of several distinct layers, working together to provide a cohesive and powerful developer experience.

### 3.1. The Schema Definition Layer

This is the primary interface for the developer. They define their graph's data models using a simple factory API within standard TypeScript files.

- **Technology:** TypeScript, Zod for validation.
- **Key Features:**
  - **Entity Definition:** Simple object-based schemas using an `EntityDef` interface.
  - **Rich Relationships:** First-class support for `one-to-one`, `one-to-many`, and abstract `many-to-many` relationships.
  - **Indexing:** Support for defining single or composite-key database indexes directly in the schema.
  - **Declarative Authorization:** A powerful `auth` property to define granular access control rules. These rules are compiled and enforced by the runtime.

### 3.2. The Generator Pipeline (`@tsmk/zg`)

This is the engine that transforms the developer's schemas into a fully-functional database client. It follows a professional, multi-stage pipeline for maximum testability and separation of concerns.

1.  **Parser:** Validates the raw schemas and transforms them into a standardized **Intermediate Representation (IR)**. This IR acts as the formal contract between the parser and the generators.
2.  **Generator:** Takes the IR and uses it as context for a templating engine to produce the final output files, including a Flatbuffers schema and a typed TypeScript client.
3.  **Writer:** Writes the generated files to the filesystem.

- **Technology:** EJS (Embedded JavaScript) for templating, Flatbuffers for the schema output (`.fbs`).

### 3.3. The Core Runtime & Storage Layer

This layer is composed of several specialized, independent packages that provide the underlying power for the generated database. They handle identity, authorization, data synchronization, and storage.

- **`@zg/ucan`:** Implements **Decentralized Identity (DIDs)** and **User-Controlled Authorization Networks (UCANs)** for a robust, verifiable permissions system.
- **`@zg/hlc`:** A **Hybrid Logical Clock** implementation used to correctly order events and data operations across a distributed network.
- **`@zg/prolly-tree`:** A **Probabilistic B-Tree (Prolly Tree)** implementation. This advanced, content-addressed data structure is the core storage engine.
- **`@zg/sync-webrtc`:** A transport layer that uses **WebRTC** to create direct peer-to-peer connections between clients for data synchronization.

### 3.4. The ZG Client: A Synchronous, Proxy-Based API

The generated ZG client is the crown jewel of the developer experience. It is a smart, proxy-based client that provides a fully synchronous API for both reading and writing data, making the database feel like a simple in-memory object.

- **Unified Lookup Logic:** All data lookups, whether finding a root record (`db.Post.find(...)`) or traversing a relationship (`myComment.post`), use a unified logic: **check the cache first, then check the main database.** This makes the system simple and predictable.
- **Synchronous Reads:** Data access is always synchronous. Developers can navigate the graph with simple dot notation (e.g., `post.author.username`) without `async/await`, leading to cleaner UI and business logic code.
- **Synchronous Writes & The Cache:** Write operations like `db.Post.create(...)` are also synchronous. They immediately write a plain JavaScript object to an in-memory cache and return a standard entity proxy.
- **Fire-and-Forget Persistence:** The expensive work of serializing the cached JS object into a Flatbuffer and writing it to the main storage happens in the background via a "fire-and-forget" promise. This ensures the UI is never blocked by serialization or I/O.
- **Event-Based Error Handling:** In the rare case that a background persistence task fails, the client can emit an `error` event, allowing the application to handle failures gracefully without complicating the primary write logic.

## 4. Putting It All Together: The Vision

A developer starts by defining their application's data graph using the ZG `createSchema` factory in familiar TypeScript files. They run the `zg` command-line tool, which triggers our generator pipeline. The pipeline parses these files and generates a fully-typed TypeScript client for all database operations.

This generated client, `zgdb`, is the developer's primary tool. When they create a post via `const post = zgdb.Post.create(...)`, the call returns **synchronously** with a proxy object. The UI can immediately render `post.title`. In the background, the ZG runtime takes this new data, signs it with the user's DID from `@zg/ucan`, timestamps it with `@zg/hlc`, and queues it for serialization into a Flatbuffer.

Later, when displaying the post, accessing `post.author.name` is a seamless, synchronous property access. The client's unified lookup logic transparently checks its cache, then the main Prolly Tree storage, to resolve the relationship and return another proxy. When a user wants to share this post, they issue a UCAN token. A friend's client connects via `@zg/sync-webrtc`, verifies the token, and efficiently synchronizes the data by diffing their local Prolly Tree with the sender's. The result is a secure, decentralized, real-time graph database that "just works," abstracting away the immense complexity of distributed systems behind a simple, synchronous API.
