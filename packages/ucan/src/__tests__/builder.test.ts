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
});
