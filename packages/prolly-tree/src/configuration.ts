import { compare } from "uint8arrays/compare";

export interface FastCDCChunking {
  chunkingStrategy: "fastcdc-v2020";
  maxInlineValueSize: number;
  minChunkSize: number;
  avgChunkSize: number;
  maxChunkSize: number;
}

export interface FixedSizeChunking {
  chunkingStrategy: "fixed-size";
  chunkSize: number;
}

// rabin-karp
export interface RabinKarpChunking {
  chunkingStrategy: "rabin-karp";
  minSize: number;
  avgSize: number;
  maxSize: number;
  windowSize: number;
}

export type ValueChunking =
  | FastCDCChunking
  | FixedSizeChunking
  | RabinKarpChunking;

export interface TreeDefinition {
  targetFanout: number;
  minFanout: number;
}

export type HashingAlgorithm = "blake3" | "sha2-256" | "sha3-256";

export interface Configuration {
  treeDefinition: TreeDefinition;
  valueChunking: ValueChunking;
  hashingAlgorithm: HashingAlgorithm;
  comparator: (a: Uint8Array, b: Uint8Array) => number;
}

// default configuration
export const defaultConfiguration: Configuration = {
  treeDefinition: {
    targetFanout: 32,
    minFanout: 16,
  },
  valueChunking: {
    chunkingStrategy: "fastcdc-v2020",
    maxInlineValueSize: 1024,
    minChunkSize: 4096,
    avgChunkSize: 16384,
    maxChunkSize: 65536,
  },
  hashingAlgorithm: "blake3",
  comparator: compare,
};
