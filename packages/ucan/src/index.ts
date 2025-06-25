// UCAN and DID implementation will go here.

// import * as ed from "@noble/ed25519";
// import { base58btc } from "multiformats/bases/base58";

// import "react-native-get-random-values";
// import { sha512 } from "@noble/hashes/sha512";
// ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
// ed.etc.sha512Async = (...m) =>
//   Promise.resolve(ed.etc.sha512Sync?.(...m) ?? new Uint8Array());

async function setupEd() {
  const ed = await import("@noble/ed25519");
  const { base58btc } = await import("multiformats/bases/base58");
  const { sha512 } = await import("@noble/hashes/sha512");
  ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
  ed.etc.sha512Async = (...m) =>
    Promise.resolve(ed.etc.sha512Sync?.(...m) ?? new Uint8Array());

  return ed;
}

const edPromise = setupEd();

// Ed25519 public keys are prefixed with 0xed01 in the multicodec table.
const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);

export class Identity {
  private readonly privateKey: Uint8Array;
  public readonly did: string;

  private constructor(privateKey: Uint8Array, did: string) {
    this.privateKey = privateKey;
    this.did = did;
  }

  public static async create(): Promise<Identity> {
    const ed = await edPromise;
    const { base58btc } = await import("multiformats/bases/base58");

    // Polyfill for noble crypto libraries in environments that don't
    // have a native crypto module. This is needed for Jest tests.
    // @ts-ignore
    if (!ed.utils.sha512Sync) {
      // @ts-ignore
      ed.utils.sha512Sync = (...m: Uint8Array[]) =>
        // @ts-ignore
        sha512(ed.utils.concatBytes(...m));
    }

    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKey(privateKey);

    // Construct the did:key string according to the multiformats spec.
    const prefixedPublicKey = new Uint8Array(
      ED25519_PREFIX.length + publicKey.length
    );
    prefixedPublicKey.set(ED25519_PREFIX);
    prefixedPublicKey.set(publicKey, ED25519_PREFIX.length);

    const did = `did:key:${base58btc.encode(prefixedPublicKey)}`;

    return new Identity(privateKey, did);
  }

  public async sign(data: Uint8Array): Promise<Uint8Array> {
    const ed = await edPromise;
    return ed.sign(data, this.privateKey);
  }
}
