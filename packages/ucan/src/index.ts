// UCAN and DID implementation will go here.

// import * as ed25519 from "@noble/ed25519";
// import { base58btc } from "multiformats/bases/base58";

const ed25519ModulePromise = import("@noble/ed25519");
const base58btcModulePromise = import("multiformats/bases/base58");

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
    const ed25519 = await ed25519ModulePromise;
    const { base58btc } = await base58btcModulePromise;

    const privateKey = ed25519.utils.randomPrivateKey();
    const publicKey = await ed25519.getPublicKey(privateKey);

    // Construct the did:key string according to the multiformats spec.
    const prefixedPublicKey = new Uint8Array(
      ED25519_PREFIX.length + publicKey.length
    );
    prefixedPublicKey.set(ED25519_PREFIX);
    prefixedPublicKey.set(publicKey, ED25519_PREFIX.length);

    const did = `did:key:${base58btc.encode(prefixedPublicKey)}`;

    return new Identity(privateKey, did);
  }
}
