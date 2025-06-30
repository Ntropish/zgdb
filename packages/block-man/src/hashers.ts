import { webcrypto } from "node:crypto";
import type { Hasher } from "./types.js";

export const sha256: Hasher = async (data: Uint8Array): Promise<Uint8Array> => {
  const hash = await webcrypto.subtle.digest("SHA-256", data);
  return new Uint8Array(hash);
};
