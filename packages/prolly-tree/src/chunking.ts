import { ValueChunking } from "./configuration.js";
import fastCDC from "fastcdc";

export function chunk(bytes: Uint8Array, config: ValueChunking): number[] {
  if (config.chunkingStrategy === "fastcdc-v2020") {
    const cdc = fastCDC as any;
    return cdc(bytes, {
      min: config.minChunkSize,
      avg: config.avgChunkSize,
      max: config.maxChunkSize,
    });
  } else if (config.chunkingStrategy === "fixed-size") {
    const offsets: number[] = [0];
    for (let i = config.chunkSize; i < bytes.length; i += config.chunkSize) {
      offsets.push(i);
    }
    // Ensure the last boundary is the end of the byte array
    if (offsets[offsets.length - 1] !== bytes.length) {
      offsets.push(bytes.length);
    }
    return offsets;
  } else if (config.chunkingStrategy === "rabin-karp") {
    throw new Error("Rabin-Karp chunking not implemented yet");
  }
  // This line should be unreachable if the config type is correct, but it satisfies the compiler
  throw new Error(`Unsupported chunking strategy`);
}
