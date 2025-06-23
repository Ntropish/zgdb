# @tsmk/kernel

[![NPM version](https://img.shields.io/npm/v/@tsmk/kernel.svg)](https://www.npmjs.com/package/@tsmk/kernel)
[![License](https://img.shields.io/npm/l/@tsmk/kernel.svg)](https://www.npmjs.com/package/@tsmk/kernel)

The core of the TSMK framework, providing the foundational building blocks for creating robust, component-based applications.

## Description

`@tsmk/kernel` is the heart of the TSMK ecosystem. It provides a powerful set of primitives for building applications, including:

- **Components and VNodes:** A declarative way to define any hierarchical component system. It is used to power routers, UI libraries, and more within the TSMK ecosystem.
- **Reactor:** A type-safe, asynchronous event bus. It allows you to register event handlers (pipelines) that are executed when an event is triggered.
- **Orchestrator:** A sequential pipeline runner. It executes an array of functions (steps) in order, passing a shared context object that can be modified by each step.

This package is designed to be lean, fast, and highly extensible, serving as the base upon which all other TSMK packages are built.

## Installation

```bash
pnpm add @tsmk/kernel
```

## Usage

### Orchestrator

The `Orchestrator` runs a pipeline of functions, passing a context object between them.

```typescript
import { Orchestrator } from "@tsmk/kernel";

type MyContext = {
  initialValue: number;
  isStep1Complete?: boolean;
};

const orchestrator = Orchestrator.create<MyContext>([
  (ctx) => {
    console.log("Step 1: Initial value is", ctx.initialValue);
    ctx.isStep1Complete = true;
  },
  (ctx) => {
    console.log("Step 2: Checking if step 1 is complete...");
    if (ctx.isStep1Complete) {
      console.log("Step 1 was completed successfully.");
    }
  },
]);

async function main() {
  await orchestrator.run({ initialValue: 42 });
}

main();
```

### Reactor

The `Reactor` is a type-safe event bus that uses the `Orchestrator` to run handlers for specific events.

```typescript
import { Reactor } from "@tsmk/kernel";

const reactor = Reactor.fromEventMap({
  userLoggedIn: [
    (ctx: { userId: string }) => console.log(`User ${ctx.userId} logged in.`),
  ],
  userLoggedOut: [
    (ctx: { userId: string }) => console.log(`User ${ctx.userId} logged out.`),
  ],
});

async function main() {
  await reactor.trigger("userLoggedIn", { userId: "u-123" });
  await reactor.trigger("userLoggedOut", { userId: "u-123" });
}

main();
```

### Components and VNodes

Components are functions that return a `VNode` (Virtual Node). This pattern allows you to build hierarchical structures for things like routers or UI.

```typescript
import { VNode, Component } from "@tsmk/kernel";

// Define a simple component
const Greeting: Component<{ name: string }> = (props) => {
  return VNode.create({
    type: "greeting",
    key: props.name,
    props,
  });
};

// Create a VNode from the component
const node = Greeting({ name: "World" });

console.log(node);
// Outputs: { type: 'greeting', key: 'World', props: { name: 'World' } }
```

## API

### `Component` & `VNode`

The core declarative building blocks for creating hierarchical component systems. This is a generic primitive used for things like the `@tsmk/router` and `@tsmk/tui`.

### `Reactor`

A type-safe asynchronous event bus. You can define an `EventMap` where each key is an event name and the value is a pipeline of functions. When you `trigger` an event, the corresponding pipeline is executed by an internal `Orchestrator`.

### `Orchestrator`

A pipeline execution kernel that runs a series of synchronous or asynchronous functions (steps) in sequence. It passes a context object to each step, which can be used to pass data through the pipeline.

### Core Types

- **`StepHandler<TContext>`**: The most basic execution unit. A function that accepts a context object.
- **`OrchestratorKernel<TContext>`**: The interface for the orchestrator, defining the `run` and `clone` methods.
- **`BREAK`**: A unique symbol that can be returned from a `StepHandler` to immediately halt a pipeline's execution.

### `SyncReactor` & `SyncOrchestrator`

Synchronous versions of `Reactor` and `Orchestrator` for use cases that do not require `async/await`.

## Contributing

Contributions are welcome! Please open an issue on GitHub to discuss any changes.

## License

[ISC](https://opensource.org/licenses/ISC)
