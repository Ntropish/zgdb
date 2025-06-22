# @tsmk/rest: Isomorphic REST Contracts - Brainstorming

This document outlines a potential design for a new `@tsmk/rest` package. The core idea is to enable developers to define a REST API contract once, and from that single source of truth, generate both a type-safe client and a robust server.

## 1. Core Philosophy

- **Single Source of Truth**: Define your API endpoints, schemas, and logic in one place. No more separate client-side models, server-side DTOs, and manually written `fetch` calls.
- **Type-Safety End-to-End**: The contract guarantees that if a client call type-checks, the server will understand the request. The response from the server is also guaranteed to match the client's expected type.
- **Isomorphic by Design**: The same contract definition is used to generate both the server and the client, eliminating the possibility of them falling out of sync.
- **Powered by TSMK**: The server-side implementation leverages the kernel model for maximum composability and extensibility. Developers can inject middleware and use the full power of the TSMK orchestrator within their route handlers.

---

## 2. The Contract Definition API (The Developer Experience)

The developer experience is centered around a fluent, chainable API for defining the contract. This makes the API easy to write, read, and extend.

### Example: A Simple User API

```typescript
// src/api/contract.ts
import { createRestContract } from "@tsmk/rest";
import { s } from "@tsmk/schema";

// Define a shared context available to all handlers.
// This is where you would put things like database clients, user info, etc.
export type ApiContext = {
  db: {
    users: {
      find: (
        id: string
      ) => Promise<{ id: string; name: string; email: string } | null>;
      create: (data: {
        name: string;
        email: string;
      }) => Promise<{ id: string }>;
    };
  };
};

// Start defining the contract
export const userApiContract = createRestContract({
  // An optional base path for all routes in this contract
  basePath: "/api/v1",
})
  .endpoint("getUser", {
    method: "GET",
    path: "/users/:id",
    description: "Get a user by their ID",
    schemas: {
      params: s.object({ id: s(s.string, s.uuid) }),
      response: s.object({
        id: s(s.string, s.uuid),
        name: s.string,
        email: s(s.string, s.email),
      }),
    },
    // The handler is a simple async function.
    // The `ctx` argument contains the validated inputs and the shared ApiContext.
    handler: async (ctx: { params: { id: string }; context: ApiContext }) => {
      const user = await ctx.context.db.users.find(ctx.params.id);
      if (!user) {
        // The library can provide a standard error class for HTTP responses.
        throw new RestError(404, "User not found");
      }
      // The return value is automatically validated against the response schema.
      return user;
    },
  })
  .endpoint("createUser", {
    method: "POST",
    path: "/users",
    description: "Create a new user",
    schemas: {
      body: s.object({
        name: s.string(),
        email: s(s.string, s.email),
      }),
      response: s.object({
        id: s(s.string, s.uuid),
      }),
    },
    handler: async (ctx: {
      body: { name: string; email: string };
      context: ApiContext;
    }) => {
      const newUser = await ctx.context.db.users.create(ctx.body);
      return newUser;
    },
  });
```

---

## 3. Server Generation

Generating a server from the contract would be trivial. The developer would import their contract and pass it to a server factory function, along with any dependencies needed for the shared context.

```typescript
// src/server.ts
import { createHttpServer } from '@tsmk/http';
import { createServerFromContract } from '@tsmk/rest';
import { userApiContract } from './api/contract';
import { Orchestrator } from '@tsmk/kernel';

// Create the dependencies needed by the handlers' context.
const dbClient = {
  users: {
    find: async (id) => (/* ... */),
    create: async (data) => (/* ... */),
  }
};

// The factory function generates a standard http.Server.
const server = createServerFromContract(userApiContract, {
  // Provide the shared context object.
  context: { db: dbClient },

  // Optionally, provide global TSMK middleware to run on every request.
  middleware: Orchestrator.create([
    (ctx) => {
      console.log(`Request received for ${ctx.req.url}`);
      // e.g., could attach authenticated user to context here.
    }
  ])
});

server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

`createServerFromContract` would use `@tsmk/http` and `@tsmk/router` under the hood to build and run the server, automatically wiring up all validation, handlers, and response logic.

---

## 4. Client Generation

Generating the client is where the true power of this approach shines. It produces a fully type-safe SDK for your API.

```typescript
// src/client.ts
import { createClientFromContract } from "@tsmk/rest";
import { userApiContract } from "./api/contract";

// The factory function generates a type-safe client.
const apiClient = createClientFromContract(userApiContract, {
  baseUrl: "http://localhost:3000",
  // You can provide a custom fetch implementation to add things
  // like authorization headers to every request.
  fetch: (url, options) => {
    const token = localStorage.getItem("token");
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
    return fetch(url, options);
  },
});

async function main() {
  // The client has methods named after the endpoints in the contract.
  // The arguments are fully typed based on the contract's schemas.
  const user = await apiClient.getUser({
    params: { id: "a-valid-uuid" },
  });

  // `user` is correctly typed as `{ id: string; name: string; email: string; }`
  console.log(user.name);

  const newUser = await apiClient.createUser({
    body: { name: "Jane Doe", email: "jane@example.com" },
  });

  // `newUser` is correctly typed as `{ id: string; }`
  console.log(newUser.id);
}
```

The generated client handles URL construction, parameter replacement, and request/response serialization automatically.

---

## 5. How TSMK Enables This

This pattern is uniquely enabled by TSMK's architecture:

- The **Contract Definition** is essentially a declarative data structure. It doesn't _do_ anything on its own; it just describes the API.
- **`createServerFromContract`** is a **compiler**. It takes this data structure and compiles it into a complex `Orchestrator.Kernel` that handles HTTP requests. Each endpoint handler becomes its own small pipeline with steps for validation, logic, and response serialization, all managed by the library.
- **`createClientFromContract`** is another **compiler**. It takes the same data structure and compiles it into a different target: a collection of type-safe functions that know how to make `fetch` calls.

By separating the **declaration** (the contract) from the **execution** (the server/client generation), we can achieve a powerful, flexible, and type-safe development experience.
