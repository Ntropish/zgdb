# @zgdb/examples

This package contains runnable examples for ZGDB, the zero-latency embedded graph database for JavaScript and TypeScript.

Each example defines a schema using Zod, generates a type-safe client via the ZGDB CLI, compiles the TypeScript code, and runs a workflow demonstrating how the database can be used.

---

## 🚀 One-Command Examples

Each example has a single script that:

1. Runs the ZGDB code generator (`zg:example`)
2. Compiles all TypeScript (`tsc`)
3. Runs the example workflow script (`run:example`)

```bash
pnpm basic
pnpm orders
pnpm university
pnpm portfolio
```
