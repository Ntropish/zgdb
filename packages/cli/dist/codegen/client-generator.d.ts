/**
 * @file src/codegen/client-generator.ts
 * @description Generates a type-safe, store-agnostic database client.
 */
import { Schema } from "./utils.js";
export declare function generateClient(schema: Schema): string;
