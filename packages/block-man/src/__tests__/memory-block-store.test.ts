import { describe, it, expect, beforeEach } from "vitest";
import { MemoryBlockStore } from "../memory-block-store.js";
import { sha256 } from "../hashers.js";
import type { Address } from "../types.js";

describe("MemoryBlockStore", () => {
  let store: MemoryBlockStore;
  let testData: Uint8Array;
  let testAddress: Address;

  beforeEach(async () => {
    store = new MemoryBlockStore();
    testData = new TextEncoder().encode("hello world");
    testAddress = await sha256(testData);
  });

  it("should put and get a block", async () => {
    const address = await store.put(testData);
    expect(address).toEqual(testAddress);

    const retrieved = await store.get(address);
    expect(retrieved).toEqual(testData);
  });

  it("should return undefined for a non-existent block", async () => {
    const fakeAddress = await sha256(new TextEncoder().encode("fake"));
    const retrieved = await store.get(fakeAddress);
    expect(retrieved).toBeUndefined();
  });

  it("should correctly check for block existence with has()", async () => {
    const address = await store.put(testData);
    expect(await store.has(address)).toBe(true);

    const fakeAddress = await sha256(new TextEncoder().encode("fake"));
    expect(await store.has(fakeAddress)).toBe(false);
  });

  it("should handle putting the same block multiple times idempotently", async () => {
    const address1 = await store.put(testData);
    const address2 = await store.put(testData);

    expect(address1).toEqual(testAddress);
    expect(address2).toEqual(address1);

    // A spy or mock could be used here to ensure the underlying store.set was only called once,
    // but for now, we'll just check the result.
    const retrieved = await store.get(address1);
    expect(retrieved).toEqual(testData);
  });

  it("should handle storing and retrieving empty blocks", async () => {
    const emptyData = new Uint8Array(0);
    const emptyAddress = await sha256(emptyData);

    const address = await store.put(emptyData);
    expect(address).toEqual(emptyAddress);
    expect(await store.has(address)).toBe(true);

    const retrieved = await store.get(address);
    expect(retrieved).toEqual(emptyData);
  });

  it("should handle large blocks", async () => {
    // Create a 1MB block of data
    const largeData = new Uint8Array(1024 * 1024);
    // Simple data, just to have a large block
    largeData.fill(1);

    const largeAddress = await sha256(largeData);
    const address = await store.put(largeData);
    expect(address).toEqual(largeAddress);

    const retrieved = await store.get(address);
    expect(retrieved).toEqual(largeData);
  });
});
