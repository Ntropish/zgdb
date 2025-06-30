import type { BlockStore, Address, Hasher } from "./types.js";
import { sha256 } from "./hashers.js";

// Map keys need to be strings, so we'll convert the Uint8Array addresses to hex strings.
const toHexString = (bytes: Uint8Array) =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

export class MemoryBlockStore implements BlockStore {
  private store: Map<string, Uint8Array>;
  private hasher: Hasher;

  constructor(hasher: Hasher = sha256) {
    this.store = new Map<string, Uint8Array>();
    this.hasher = hasher;
  }

  async get(address: Address): Promise<Uint8Array | undefined> {
    const hexAddress = toHexString(address);
    return this.store.get(hexAddress);
  }

  async put(block: Uint8Array): Promise<Address> {
    const address = await this.hasher(block);
    const hexAddress = toHexString(address);
    this.store.set(hexAddress, block);
    return address;
  }

  async has(address: Address): Promise<boolean> {
    const hexAddress = toHexString(address);
    return this.store.has(hexAddress);
  }
}
