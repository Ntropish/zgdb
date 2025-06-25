import { Identity } from "..";

describe("Identity", () => {
  it("should create a new identity with a valid DID", async () => {
    const identity = await Identity.create();
    expect(identity).toBeDefined();
    // A 'did:key' string for an Ed25519 key starts with 'did:key:z6Mk'.
    expect(identity.did).toMatch(/^did:key:z6Mk/);
  });
});
