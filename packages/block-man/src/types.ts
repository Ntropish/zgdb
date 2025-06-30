export type Address = Uint8Array;

export interface BlockStore {
  /**
   * Retrieves a block of data from the store.
   * @param address The content address of the block.
   * @returns A Promise that resolves to the block's data as a Uint8Array, or undefined if not found.
   */
  get: (address: Address) => Promise<Uint8Array | undefined>;

  /**
   * Stores a block of data.
   * @param block The block data to store.
   * @returns A Promise that resolves to the content address of the stored block.
   */
  put: (block: Uint8Array) => Promise<Address>;

  /**
   * Checks for the existence of a block.
   * @param address The content address of the block.
   * @returns A Promise that resolves to true if the block exists, false otherwise.
   */
  has: (address: Address) => Promise<boolean>;
}

export interface Hasher {
  (data: Uint8Array): Promise<Address>;
}
