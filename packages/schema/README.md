# `@tsmk/schema`: A Kernel-First Validation Library

Welcome, engineer! Before you dive into the code, it's important to understand the core architectural philosophy that powers `@tsmk/schema`. This isn't just another validation library; it's a demonstration of the `ts-kernel` principles in action.

## The Core Idea: Schemas are Pipelines

At its heart, **every schema is just a pre-configured `Orchestrator` kernel.**

The `Orchestrator` microkernel is designed to run a predictable, sequential pipeline of steps. We leverage this to build our validation logic. When you create a schema, you are assembling a pipeline that a piece of data will travel through. Each step in the pipeline can check, transform, or refine the data.

## The Fluent API is a Builder

The developer-friendly fluent API (`s.string()`, `s.object()`, etc.) is a **builder**. Its sole purpose is to make it easy and intuitive to construct and configure the underlying `Orchestrator` kernel.

When a developer writes this:

```typescript
const schema = s.string().minLength(5);
```

What's happening under the hood is:

1. `s.string()` creates a new `StringSchema` object, which contains an `Orchestrator` kernel pre-configured with a single step: `isString`.
2. The `.minLength(5)` method **clones** the existing kernel, adds a new `minLength` step to the pipeline, and returns a **new** `StringSchema` instance containing the new, more complex kernel.

## Immutability is the Key to Type Inference

This "clone and add" strategy is the most critical concept to grasp. **We never mutate a schema. We always return a new one.**

This immutability is what makes our `s.infer<...>` utility possible. Because each method in the chain returns a new `Schema` object with updated `<Input, Output>` generic types, TypeScript can track the changes at compile time.

- `s.string()` returns a `Schema<string, string>`.
- `.transform(s => s.length)` returns a `Schema<string, number>`.

Without this immutable pattern, robust type inference would be impossible.

## How to Contribute

When adding a new feature, always follow this pattern:

1.  **Add a method** to the appropriate `Schema` class (e.g., `StringSchema`, `ObjectSchema`).
2.  Inside the method, **clone the current kernel** using `this._clone()`.
3.  **Register your new step** (`Orchestrator.StepHandler`) with the cloned kernel.
4.  **Return a new instance** of the `Schema`, passing the new kernel to its constructor.

By adhering to this architecture, we maintain a clean separation between the powerful, composable kernel-based core and the elegant, type-safe fluent API that developers love.
