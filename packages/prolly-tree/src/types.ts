export type Diff = {
  key: Uint8Array;
  localValue?: Uint8Array;
  remoteValue?: Uint8Array;
};

export type ConflictResolver = (
  key: Uint8Array,
  base: Uint8Array | undefined,
  local: Uint8Array | undefined,
  remote: Uint8Array | undefined
) => Promise<Uint8Array | undefined>;
