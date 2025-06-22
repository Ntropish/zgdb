import { s, validate } from "../s";

describe("Schema Modifiers", () => {
  describe(".optional()", () => {
    it("should succeed for a valid value", async () => {
      const schema = s.string.optional();
      const result = await validate(schema, "hello");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello");
      }
    });

    it("should succeed for an undefined value", async () => {
      const schema = s.string.optional();
      const result = await validate(schema, undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    it("should fail for a null value", async () => {
      const schema = s.string.optional();
      const result = await validate(schema, null as any);
      expect(result.success).toBe(false);
    });

    it("should compose with other validators", async () => {
      const schema = s(s.string, s.minLength(5)).optional();
      const result = await validate(schema, "hello world");
      expect(result.success).toBe(true);

      const failedResult = await validate(schema, "hi" as any);
      expect(failedResult.success).toBe(false);
    });
  });

  describe(".nullable()", () => {
    it("should succeed for a valid value", async () => {
      const schema = s.number.nullable();
      const result = await validate(schema, 123);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(123);
      }
    });

    it("should succeed for a null value", async () => {
      const schema = s.number.nullable();
      const result = await validate(schema, null);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should fail for an undefined value", async () => {
      const schema = s.number.nullable();
      const result = await validate(schema, undefined as any);
      expect(result.success).toBe(false);
    });
  });

  describe("Chaining modifiers", () => {
    it("should handle .optional().nullable()", async () => {
      const schema = s.string.optional().nullable();
      const validResult1 = await validate(schema, "hello");
      expect(validResult1.success).toBe(true);

      const validResult2 = await validate(schema, undefined);
      expect(validResult2.success).toBe(true);

      const validResult3 = await validate(schema, null);
      expect(validResult3.success).toBe(true);
    });
  });
});
