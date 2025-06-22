import { s, validate } from "../s";

describe("Union Schema", () => {
  it("should succeed for a union of primitive types", async () => {
    const schema = s.union([s.string, s.number]);

    const strResult = await validate(schema, "hello");
    expect(strResult.success).toBe(true);
    if (strResult.success) {
      expect(strResult.data).toBe("hello");
    }

    const numResult = await validate(schema, 123);
    expect(numResult.success).toBe(true);
    if (numResult.success) {
      expect(numResult.data).toBe(123);
    }
  });

  it("should fail for a type not in the union", async () => {
    const schema = s.union([s.string, s.number]);
    const result = await validate(schema, true as any);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error[0].message).toContain(
        "Input did not match any of the union schemas."
      );
    }
  });

  it("should handle discriminated unions of objects", async () => {
    const catSchema = s.object({
      type: s.literal("cat"),
      name: s.string,
    });

    const dogSchema = s.object({
      type: s.literal("dog"),
      breed: s.string,
    });

    const petSchema = s.union([catSchema, dogSchema]);

    const catResult = await validate(petSchema, { type: "cat", name: "Felix" });
    expect(catResult.success).toBe(true);
    if (catResult.success) {
      expect(catResult.data).toEqual({ type: "cat", name: "Felix" });
    }

    const dogResult = await validate(petSchema, {
      type: "dog",
      breed: "Poodle",
    });
    expect(dogResult.success).toBe(true);
    if (dogResult.success) {
      expect(dogResult.data).toEqual({ type: "dog", breed: "Poodle" });
    }

    const failedResult = await validate(petSchema, {
      type: "bird",
      canFly: true,
    } as any);
    expect(failedResult.success).toBe(false);
  });
});
