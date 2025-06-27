/**
 * @file The Prolly Tree implementation will be built here.
 *
 * This will include:
 * - A content-addressed block store.
 * - Node and leaf structures.
 * - Functions for get, put, delete.
 * - The core diff and merge algorithms.
 */

export { ProllyTree } from "./prolly-tree.js";
export { Store } from "./store.js";
export type {
  Configuration,
  ValueChunking,
  TreeDefinition,
  HashingAlgorithm,
  FastCDCChunking,
  FixedSizeChunking,
  RabinKarpChunking,
} from "./configuration.js";
export { defaultConfiguration } from "./configuration.js";
export type { Diff, ConflictResolver } from "./types.js";
