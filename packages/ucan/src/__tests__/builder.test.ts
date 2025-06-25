import { Identity } from "../index";
import { createUcanBuilder, UCANPayload, sign, verify } from "../builder";

describe("UCAN Builder", () => {
  it("should build and sign a UCAN token", async () => {
    const issuer = await Identity.create();
    const audience = await Identity.create();

    const builder = createUcanBuilder()
      .issuer(issuer.did)
      .audience(audience.did)
      .withCapability({
        with: "my-service",
        can: "do/something",
      })
      .expiresIn(30);

    const payload = await builder.build({});
    const token = await sign(payload as UCANPayload, issuer);

    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decodedPayload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString("utf-8")
    );

    expect(decodedPayload.issuer).toBe(issuer.did);
    expect(decodedPayload.audience).toBe(audience.did);
    expect(decodedPayload.capabilities[0].can).toBe("do/something");
  });

  it("should verify a valid UCAN token", async () => {
    const issuer = await Identity.create();
    const audience = await Identity.create();

    const payload = await createUcanBuilder()
      .issuer(issuer.did)
      .audience(audience.did)
      .expiresIn(60)
      .build({});

    const token = await sign(payload as UCANPayload, issuer);

    const isValid = await verify(token);

    expect(isValid).toBe(true);
  });

  it("should fail to verify a token with a bad signature", async () => {
    const issuer = await Identity.create();
    const audience = await Identity.create();
    const attacker = await Identity.create();

    const payload = await createUcanBuilder()
      .issuer(issuer.did)
      .audience(audience.did)
      .expiresIn(60)
      .build({});

    const token = await sign(payload as UCANPayload, attacker); // Signed by the wrong identity

    const isValid = await verify(token);
    expect(isValid).toBe(false);
  });

  it("should fail to verify an expired token", async () => {
    const issuer = await Identity.create();
    const audience = await Identity.create();

    const payload = await createUcanBuilder()
      .issuer(issuer.did)
      .audience(audience.did)
      .expiresIn(-60) // Expired 60 seconds ago
      .build({});

    const token = await sign(payload as UCANPayload, issuer);
    const isValid = await verify(token);
    expect(isValid).toBe(false);
  });

  it("should successfully delegate a capability", async () => {
    const rootIssuer = await Identity.create();
    const delegatee = await Identity.create();
    const audience = await Identity.create();

    // 1. Root user creates a UCAN with broad permissions for the delegatee
    const rootUcanPayload = await createUcanBuilder()
      .issuer(rootIssuer.did)
      .audience(delegatee.did)
      .withCapability({ with: "my-service", can: "crud/*" })
      .expiresIn(300)
      .build({});
    const rootUcanToken = await sign(
      rootUcanPayload as UCANPayload,
      rootIssuer
    );

    // 2. The delegatee creates a new UCAN, delegating a more specific permission to the final audience
    const delegatedUcanPayload = await createUcanBuilder()
      .issuer(delegatee.did)
      .audience(audience.did)
      .withCapability({ with: "my-service", can: "crud/read" })
      .expiresIn(60)
      .delegate(rootUcanToken) // New capability
      .build({});
    const delegatedUcanToken = await sign(
      delegatedUcanPayload as UCANPayload,
      delegatee
    );

    // 3. Verify the delegated UCAN. This should now check the full proof chain.
    const isValid = await verify(delegatedUcanToken);
    expect(isValid).toBe(true);
  });

  it("should fail to verify a delegated UCAN with invalid capabilities", async () => {
    const rootIssuer = await Identity.create();
    const delegatee = await Identity.create();
    const audience = await Identity.create();

    // 1. Root user creates a UCAN with specific permissions
    const rootUcanToken = await sign(
      (await createUcanBuilder()
        .issuer(rootIssuer.did)
        .audience(delegatee.did)
        .withCapability({ with: "my-service", can: "crud/read" })
        .expiresIn(300)
        .build({})) as UCANPayload,
      rootIssuer
    );

    // 2. The delegatee attempts to escalate privileges to 'write'
    const delegatedUcanToken = await sign(
      (await createUcanBuilder()
        .issuer(delegatee.did)
        .audience(audience.did)
        .withCapability({ with: "my-service", can: "crud/write" }) // Invalid escalation
        .expiresIn(60)
        .delegate(rootUcanToken)
        .build({})) as UCANPayload,
      delegatee
    );

    // 3. Verification should fail because crud/write is not a subset of crud/read.
    const isValid = await verify(delegatedUcanToken);
    expect(isValid).toBe(false);
  });
});
