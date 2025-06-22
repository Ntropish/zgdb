import { s, validate } from "../s";

describe("String Format Validators", () => {
  it("should validate a valid cuid", async () => {
    const schema = s(s.string, s.cuid);
    const result = await validate(schema, "cjld2cjxh0000qzrmn831i7rn");
    expect(result.success).toBe(true);
  });

  it("should fail for an invalid cuid", async () => {
    const schema = s(s.string, s.cuid);
    const result = await validate(schema, "invalid-cuid");
    expect(result.success).toBe(false);
  });

  it("should validate a valid cuid2", async () => {
    const schema = s(s.string, s.cuid2);
    const result = await validate(schema, "tz4a98xxat96iws9zmbrgj3a");
    expect(result.success).toBe(true);
  });

  it("should fail for an invalid cuid2", async () => {
    const schema = s(s.string, s.cuid2);
    const result = await validate(schema, "invalid-cuid2");
    expect(result.success).toBe(false);
  });

  it("should validate a valid ulid", async () => {
    const schema = s(s.string, s.ulid);
    const result = await validate(schema, "01H2J3K4M5N6P7R8S9T0V1W2X3");
    expect(result.success).toBe(true);
  });

  it("should fail for an invalid ulid", async () => {
    const schema = s(s.string, s.ulid);
    const result = await validate(schema, "invalid-ulid");
    expect(result.success).toBe(false);
  });

  it("should validate a valid uuid", async () => {
    const schema = s(s.string, s.uuid);
    const result = await validate(
      schema,
      "123e4567-e89b-12d3-a456-426614174000"
    );
    expect(result.success).toBe(true);
  });

  it("should fail for an invalid uuid", async () => {
    const schema = s(s.string, s.uuid);
    const result = await validate(schema, "invalid-uuid");
    expect(result.success).toBe(false);
  });
});
