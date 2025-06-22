import { s, validate } from "../s";

describe("Coercion", () => {
  it("should coerce a number to a string", async () => {
    const schema = s.coerce.string;
    const result = await validate(schema, 123);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("123");
    }
  });

  it("should coerce a string to a number", async () => {
    const schema = s.coerce.number;
    const result = await validate(schema, "123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(123);
    }
  });

  it("should fail to coerce a non-numeric string to a number", async () => {
    const schema = s.coerce.number;
    const result = await validate(schema, "abc");
    expect(result.success).toBe(false);
  });

  it("should coerce a string 'true' to a boolean", async () => {
    const schema = s.coerce.boolean;
    const result = await validate(schema, "true");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
  });

  it("should coerce a number 1 to a boolean", async () => {
    const schema = s.coerce.boolean;
    const result = await validate(schema, 1);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(true);
    }
  });

  it("should coerce a string to a bigint", async () => {
    const schema = s.coerce.bigint;
    const result = await validate(schema, "123");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe(123n);
    }
  });
});
