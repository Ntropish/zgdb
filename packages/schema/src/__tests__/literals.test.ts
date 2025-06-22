import { s, validate } from "../s";

describe("Literal Schemas", () => {
  it("should validate a correct string literal", async () => {
    const schema = s.literal("hello");
    const result = await validate(schema, "hello");
    expect(result.success).toBe(true);
  });

  it("should fail for an incorrect string literal", async () => {
    const schema = s.literal("hello");
    const result = await validate(schema, "world");
    expect(result.success).toBe(false);
  });

  it("should validate a correct number literal", async () => {
    const schema = s.literal(123);
    const result = await validate(schema, 123);
    expect(result.success).toBe(true);
  });

  it("should fail for an incorrect number literal", async () => {
    const schema = s.literal(123);
    const result = await validate(schema, 456);
    expect(result.success).toBe(false);
  });

  it("should validate a correct boolean literal", async () => {
    const schema = s.literal(true);
    const result = await validate(schema, true);
    expect(result.success).toBe(true);
  });

  it("should fail for an incorrect boolean literal", async () => {
    const schema = s.literal(true);
    const result = await validate(schema, false);
    expect(result.success).toBe(false);
  });
});
