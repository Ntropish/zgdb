# ZG: A Schema-Driven, Decentralized Graph Database

## 1. Mission Statement

Our mission is to create **ZG**, a next-generation graph database designed for modern, decentralized applications. ZG empowers developers to build real-time, collaborative, and offline-first applications with the safety and productivity of a strongly-typed, schema-driven workflow. By combining a powerful code generation pipeline with cutting-edge decentralized technologies, ZG will provide a seamless developer experience for building complex, peer-to-peer systems.

## 2. Core Philosophy

- **Developer Experience First:** A declarative, TypeScript-native schema with a powerful, fluent API should make defining and interacting with the graph intuitive and enjoyable.
- **Type-Safety End-to-End:** Leverage code generation to provide full type-safety from the database schema to the application layer, eliminating a common class of errors.
- **Decentralization at the Core:** Build on a foundation of decentralized identity (DIDs), authorization (UCANs), and data replication (CRDTs) to enable true peer-to-peer and serverless architectures.
- **Performance & Efficiency:** Utilize high-performance serialization formats (Flatbuffers) and advanced data structures (Prolly Trees) to ensure minimal latency and efficient data synchronization.

## 3. Architecture Overview

The ZG ecosystem is composed of several distinct layers, working together to provide a cohesive and powerful developer experience.

### 3.1. The Schema Definition Layer

This is the primary interface for the developer. They define their graph's data models using a schema-builder API within standard TypeScript files.

- **Technology:** TypeScript, Zod for validation.
- **Key Features:**
  - **Entity & Field Definition:** Simple object-based schemas.
  - **Rich Relationships:** First-class support for `one-to-one`, `one-to-many`, and abstract `many-to-many` relationships.
  - **Polymorphism:** A robust API for defining relationships to one of several possible entity types.
  - **Indexing:** Support for defining single or composite-key database indexes (`btree`, `hash`, `fulltext`) directly in the schema.

### 3.2. The Generator Pipeline (`@tsmk/zg`)

This is the engine that transforms the developer's schemas into a fully-functional database client. It follows a professional, 4-stage pipeline for maximum testability and separation of concerns.

1.  **Loader:** Discovers and loads all user-defined schema files from the project.
2.  **Parser:** Validates the raw schemas and transforms them into a standardized **Intermediate Representation (IR)**. This IR acts as the formal contract between the parser and the generator.
3.  **Generator:** Takes the IR and uses it as context for a templating engine to produce the final output files.
4.  **Writer:** Writes the generated files to the filesystem.

- **Technology:** EJS (Embedded JavaScript) for templating, Flatbuffers for the schema output (`.fbs`).

### 3.3. The Core Runtime & Storage Layer

This layer is composed of several specialized, independent packages that provide the underlying power for the generated database. They handle identity, authorization, data synchronization, and storage.

- **`@zg/ucan`:** Implements **Decentralized Identity (DIDs)** and **User-Controlled Authorization Networks (UCANs)**. This provides a robust, verifiable, and decentralized permissions system based on the JWT standard.
- **`@zg/crdt`:** Provides **Conflict-Free Replicated Data Types**. This is the core of our real-time and offline-first capabilities, allowing data from multiple peers to be merged automatically without conflict.
- **`@zg/hlc`:** A **Hybrid Logical Clock** implementation used to correctly order events and data operations across a distributed network of peers without a central timestamping authority.
- **`@zg/prolly-log`:** A **Probabilistic B-Tree (Prolly Tree)** implementation. This advanced, content-addressed data structure will be used for the underlying storage engine, providing efficient diffing, history traversal, and data synchronization.
- **`@zg/sync-webrtc`:** A transport layer that uses **WebRTC** to create direct peer-to-peer connections between clients, allowing them to synchronize their data directly without passing through a central server.

## 4. Putting It All Together: The Vision

A developer starts by defining their application's data graph using the ZG schema API in familiar TypeScript files. They run the `zg` command-line tool, which triggers our generator pipeline. The pipeline parses these files into a Flatbuffers schema and generates a fully-typed TypeScript client API for all database operations (create, read, update, delete, query, traverse).

This generated client is powered by the ZG runtime. When a user creates a `Post`, they are identified by a DID from `@zg/ucan`. The operation is timestamped by `@zg/hlc` and stored as a CRDT in a Prolly Tree log via `@zg/prolly-log`. When they want to share this post with a friend, they issue a UCAN token granting read access. The friend's client, using `@zg/sync-webrtc`, connects directly, verifies the UCAN, and synchronizes the CRDT data, merging it into their own local Prolly Tree. The result is a secure, decentralized, real-time graph database that "just works," abstracting away the immense complexity of distributed systems.
