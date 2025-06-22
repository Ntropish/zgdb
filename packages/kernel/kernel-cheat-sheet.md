# TSMK Kernel Cheat Sheet

This document provides a quick reference to the three core kernels available in TSMK: the `Reactor`, `Simulator`, and `Orchestrator`.

---

## 1. The Reactor (Event-Driven)

The `Reactor` is a powerful event emitter that allows for decoupled communication between different parts of an application. Its listeners are defined declaratively at creation time via plugins.

### Nouns

- **Event Map**: A type that maps event names (e.g., `'user:created'`) to their specific payload shapes (e.g., `{ userId: string }`).
- **Plugin**: A data structure that maps event names to a `Hook` function or an array of `Hook` functions. This is the sole mechanism for registering listeners.
- **Hook**: A listener function that reacts to an event.
- **Event Context**: An object passed to every `Hook`, containing the `eventName` and the event-specific `args` (the payload).

### Verbs

| Method                         | Description                                                                 |
| ------------------------------ | --------------------------------------------------------------------------- |
| `create<TEventMap>({plugins})` | Creates a new, type-safe `Reactor` kernel, installing all provided plugins. |
| `trigger(eventName, payload)`  | Dispatches an event with its payload, calling all registered `Hooks`.       |

---

## 2. The Simulator (Stateful Simulation)

The `Simulator` provides a game loop for managing and updating the state of entities over time. Its logic is defined declaratively at creation time.

### Nouns

- **Entity**: A simple object with an `id`. You define the specific shape of your entities (e.g., `Player | Monster`).
- **System**: A function containing simulation logic that operates on entities each frame. You provide an array of these at creation.

### Verbs

| Method                       | Description                                                            |
| ---------------------------- | ---------------------------------------------------------------------- |
| `create<TEntity>({systems})` | Creates a new, type-safe `Simulator` kernel with the provided systems. |
| `add(entity)`                | Adds an `Entity` to the simulation world.                              |
| `get(id)`                    | Retrieves a single `Entity` by its ID.                                 |
| `getAll()`                   | Retrieves an array of all entities in the simulation.                  |
| `start()`                    | Begins the simulation loop.                                            |
| `stop()`                     | Halts the simulation loop.                                             |

---

## 3. The Orchestrator (Pipeline Processor)

The `Orchestrator` runs a pipeline of sequential, asynchronous steps, passing a mutable context object through each one. The pipeline is defined declaratively at creation time.

### Nouns

- **Pipeline Context**: A type you define that holds the state for a single pipeline execution.
- **Step**: A function that receives the `PipelineContext`, performs an action, and can optionally modify the context. You provide an array of these at creation.
- **BREAK**: A special symbol that a `Step` can return to halt the pipeline immediately.

### Verbs

| Method                      | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| `create<TContext>({steps})` | Creates a new, type-safe `Orchestrator` kernel with the provided steps. |
| `run(initialContext)`       | Executes the pipeline, passing the `initialContext` to the first step.  |
| `clone()`                   | Creates a new `Orchestrator` instance with the same registered steps.   |
