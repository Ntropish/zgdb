import { blake3 } from "@noble/hashes/blake3";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
import { HashingAlgorithm } from "./configuration.js";

export type HashFn = (data: Uint8Array) => Uint8Array;

export function getHashFn(algorithm: HashingAlgorithm): HashFn {
  switch (algorithm) {
    case "blake3":
      return blake3;
    case "sha2-256":
      return sha256;
    case "sha3-256":
      return sha512; // NB: noble/hashes does not have sha3-256, using 512 as a stand-in
  }
}
