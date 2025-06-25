import { Identity } from "./index";
import {
  createFluentBuilder,
  FluentBuilder,
  CapabilityMap,
} from "@tsmk/builder";
import { sha512 } from "@noble/hashes/sha512";

export interface Capability {
  with: string;
  can: string;
}

export interface UCANPayload {
  issuer: string;
  audience: string;
  capabilities: Capability[];
  expiration: number;
  prf?: string; // Proof (a parent UCAN)
}

// Define the state that our builder will manage
type BuilderState = Partial<UCANPayload>;

// Define the methods (capabilities) our builder will have
type BuilderCapabilities = {
  issuer: (did: string) => void;
  audience: (did: string) => void;
  withCapability: (cap: Capability) => void;
  expiresIn: (seconds: number) => void;
  delegate: (proof: string) => void;
};

// Create a typed shorthand for our specific fluent builder
export type UCANBuilder = FluentBuilder<BuilderState, BuilderCapabilities>;

/**
 * Creates a new fluent builder for UCANs.
 */
export function createUcanBuilder(): UCANBuilder {
  const capabilities: CapabilityMap<BuilderState, BuilderCapabilities> = {
    issuer: {
      build: (state, _, did) => {
        state.issuer = did;
      },
    },
    audience: {
      build: (state, _, did) => {
        state.audience = did;
      },
    },
    withCapability: {
      build: (state, _, cap) => {
        if (!state.capabilities) {
          state.capabilities = [];
        }
        state.capabilities.push(cap);
      },
    },
    expiresIn: {
      build: (state, _, seconds) => {
        state.expiration = Math.floor(Date.now() / 1000) + seconds;
      },
    },
    delegate: {
      build: (state, _, proof) => {
        state.prf = proof;
      },
    },
  };

  return createFluentBuilder<BuilderState, BuilderCapabilities>(capabilities);
}

export async function sign(
  payload: UCANPayload,
  signer: Identity
): Promise<string> {
  const ed = await setupEd();
  const header = { alg: "EdDSA", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url"
  );

  const dataToSign = new TextEncoder().encode(
    `${encodedHeader}.${encodedPayload}`
  );
  const signatureBytes = await signer.sign(dataToSign);
  const signature = Buffer.from(signatureBytes).toString("base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function isAttenuationValid(child: UCANPayload, parent: UCANPayload): boolean {
  return child.capabilities.every((childCap) =>
    parent.capabilities.some((parentCap) => {
      if (childCap.with !== parentCap.with) {
        return false;
      }
      if (parentCap.can.endsWith("*")) {
        const prefix = parentCap.can.slice(0, -1);
        return childCap.can.startsWith(prefix);
      }
      return childCap.can === parentCap.can;
    })
  );
}

export async function verify(token: string): Promise<boolean> {
  const ed = await setupEd();
  const { base58btc } = await import("multiformats/bases/base58");

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Invalid UCAN format");
  }

  const payload = JSON.parse(
    Buffer.from(encodedPayload, "base64url").toString("utf-8")
  ) as UCANPayload;

  // 1. Check expiration
  if (payload.expiration < Math.floor(Date.now() / 1000)) {
    return false; // Token has expired
  }

  // 2. Decode the public key from the issuer's DID
  const did = payload.issuer;
  if (!did.startsWith("did:key:")) {
    throw new Error("Invalid DID format");
  }
  const didKey = did.substring(8);
  const prefixedPublicKey = base58btc.decode(didKey);
  const publicKey = prefixedPublicKey.slice(2); // Remove the 0xed01 prefix

  // 3. Verify the signature
  const dataToVerify = new TextEncoder().encode(
    `${encodedHeader}.${encodedPayload}`
  );
  const signature = Buffer.from(encodedSignature, "base64url");

  const isSignatureValid = await ed.verify(signature, dataToVerify, publicKey);

  if (!isSignatureValid) {
    return false;
  }

  // 4. If a proof exists, recursively verify the chain and check attenuation.
  if (payload.prf) {
    const parentPayload = JSON.parse(
      Buffer.from(payload.prf.split(".")[1], "base64url").toString()
    ) as UCANPayload;

    if (!isAttenuationValid(payload, parentPayload)) {
      return false;
    }

    return verify(payload.prf);
  }

  // If we've reached here, the UCAN is valid and has no more proofs to check.
  return true;
}

async function setupEd() {
  const ed = await import("@noble/ed25519");
  ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
  ed.etc.sha512Async = (...m) =>
    Promise.resolve(ed.etc.sha512Sync?.(...m) ?? new Uint8Array());

  return ed;
}
