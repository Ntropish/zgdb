import { Configuration } from "./configuration.js";
import { KeyValuePair, BranchPair } from "./node-proxy.js";
import { sha256 } from "@noble/hashes/sha256";
import { bytesToNumber } from "./utils.js";

function isKeyValuePair(item: KeyValuePair | BranchPair): item is KeyValuePair {
  return (item as KeyValuePair).value !== undefined;
}

async function createBoundaryTest(config: Configuration) {
  const boundaryChecker = config.treeDefinition.boundaryChecker;

  if (boundaryChecker.type === "prolly-v1") {
    const pattern = BigInt(boundaryChecker.pattern);
    const bits = BigInt(boundaryChecker.bits);
    const mask = (1n << bits) - 1n;
    return (key: Uint8Array): boolean => {
      const hash = sha256(key);
      const hashInt = bytesToNumber(hash);
      return (hashInt & mask) === pattern;
    };
  }

  throw new Error(`Unsupported boundary checker type: ${boundaryChecker.type}`);
}

export async function nodeChunker<T extends KeyValuePair | BranchPair>(
  items: T[],
  config: Configuration
): Promise<T[][]> {
  const chunks: T[][] = [];
  if (items.length === 0) {
    return [];
  }

  const boundaryTest = await createBoundaryTest(config);
  const min = config.treeDefinition.minFanout;
  const max = config.treeDefinition.targetFanout * 2; // A reasonable max

  let currentChunk: T[] = [];

  for (const item of items) {
    currentChunk.push(item);

    const atMin = currentChunk.length >= min;
    const atMax = currentChunk.length >= max;
    // The key in a BranchPair is the upper bound of the child node's keys.
    // The key in a KeyValuePair is the key of the data.
    // Both can be used for boundary detection.
    const atBoundary = boundaryTest(item.key);

    if ((atMin && atBoundary) || atMax) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
  }

  if (currentChunk.length > 0) {
    if (chunks.length > 0 && currentChunk.length < min) {
      const lastChunk = chunks[chunks.length - 1];
      chunks[chunks.length - 1] = lastChunk.concat(currentChunk);
    } else {
      chunks.push(currentChunk);
    }
  }

  return chunks;
}
