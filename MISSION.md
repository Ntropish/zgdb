# Mission: A Zero-Copy, Synchronous Database Toolkit

Our mission is to provide an unparalleled developer experience for building high-performance, local-first applications. We achieve this with a database toolkit that is **zero-copy, fully synchronous, and FlatBuffer-native**.

The core philosophy is simple: **data access should feel like interacting with in-memory objects.**

We treat the database as a set of in-memory data structures that can be accessed synchronously, without the overhead of `async/await`. This is made possible by leveraging Google's FlatBuffers for zero-copy reads and a Prolly Tree for storage, with a synchronous API for both reads and writes.

## Core Principles

1.  **Fully Synchronous API**: All database operations, including reads, writes, updates, and relationship traversals (`post.author`), are fully synchronous. This simplifies application logic by eliminating `async/await` for database calls.

2.  **Live Data Objects**: When you fetch a node from the database, you get back a "live" proxy object. Reading a property on this object is a zero-copy read directly from the underlying FlatBuffer. Assigning a new value to a property (`post.title = 'new'`) triggers an immediate, synchronous write to the database, persisting the change before returning.

3.  **Schema-First Development**: Define your entities, fields, and relationships in simple, declarative TypeScript files. The ZG toolkit handles the rest.

4.  **End-to-End Type Safety**: The code generator consumes your schema and produces a fully type-safe client. This includes not only your entity fields but also your relationships and custom-defined resolvers. If it compiles, it works.

## How It Works

The toolkit is a collection of focused packages that work in concert:

- **`@zgdb/generate`**: The heart of the toolkit. It parses your entity definitions and generates everything you need:

  - The low-level FlatBuffers schema (`.fbs`).
  - The TypeScript bindings for that schema.
  - A high-level, type-safe `createDB` factory function and all associated collection and node classes.

- **`@zgdb/client`**: The runtime library that the generated code depends on. It provides the `ZgDatabase` class which manages the underlying Prolly Tree and the proxy-based "live" objects.

- **`@zgdb/prolly-tree`**: A Prolly Tree implementation with a fully synchronous CRUD API, which serves as the storage foundation.

- **`@zgdb/vite-plugin`**: For a seamless development experience, this plugin watches your schema files and automatically triggers the generator on any change, providing instantaneous updates and hot-reloading in your application.

The end result is an application development experience that feels more like manipulating local objects than querying a remote database, but with all the power and persistence you expect.
