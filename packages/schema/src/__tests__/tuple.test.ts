import { s, validate } from "../s";

describe("Tuple Schemas", () => {
  it("should validate a correct tuple of primitives", async () => {
    const schema = s.tuple([s.string, s.number, s.boolean]);
    const result = await validate(schema, ["hello", 123, true]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["hello", 123, true]);
    }
  });

  it("should fail for a tuple with an incorrect element type", async () => {
    const schema = s.tuple([s.string, s.number, s.boolean]);
    // @ts-expect-error
    const result = await validate(schema, ["hello", "123", true]); // "123" is a string
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0].path).toEqual([1]);
      expect(result.error[0].message).toBe("Expected number, received string");
    }
  });

  it("should fail for a tuple with the incorrect length (too short)", async () => {
    const schema = s.tuple([s.string, s.number, s.boolean]);
    // @ts-expect-error
    const result = await validate(schema, ["hello", 123]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error[0].message).toBe(
        "Expected a tuple of length 3, but received 2"
      );
    }
  });

  it("should fail for a tuple with the incorrect length (too long)", async () => {
    const schema = s.tuple([s.string, s.number]);
    const result = await validate(schema, ["hello", 123, true]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error[0].message).toBe(
        "Expected a tuple of length 2, but received 3"
      );
    }
  });

  it("should validate a tuple containing objects", async () => {
    const schema = s.tuple([
      s.object({ name: s.string }),
      s.object({ id: s.number }),
    ]);
    const result = await validate(schema, [{ name: "Alice" }, { id: 101 }]);
    expect(result.success).toBe(true);
  });

  it("should fail and report nested errors within a tuple's object", async () => {
    const schema = s.tuple([
      s.object({ name: s.string }),
      s.object({ id: s.number }),
    ]);
    const result = await validate(schema, [
      { name: "Alice" },
      // @ts-expect-error
      { id: "101" }, // id is wrong type
    ]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0].path).toEqual([1, "id"]);
      expect(result.error[0].message).toBe("Expected number, received string");
    }
  });

  it("should fail and report multiple errors in a tuple", async () => {
    const schema = s.tuple([s.string, s.number, s.boolean]);
    // @ts-expect-error
    const result = await validate(schema, [123, "hello", "false"]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(3);
      expect(result.error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: [0],
            message: "Expected string, received number",
          }),
          expect.objectContaining({
            path: [1],
            message: "Expected number, received string",
          }),
          expect.objectContaining({
            path: [2],
            message: "Expected boolean, received string",
          }),
        ])
      );
    }
  });
});
