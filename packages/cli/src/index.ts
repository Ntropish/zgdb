/**
 * This is the main entry point for the Zod Graph DB library itself.
 * It's intended to be used by the generated code, not directly by the end-user.
 */

// We will export the PTree types for the generator to use in its config definitions.
// Assuming 'prolly-gunna' is the package name for the PTree implementation.
export type { TreeConfigOptions } from "prolly-gunna";

// The createClient function will be moved to its own file.
export { createClient } from "./runtime/client";
