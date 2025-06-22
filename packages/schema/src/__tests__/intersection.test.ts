import { s, validate } from "../s";

describe("Intersection Schemas", () => {
  it("should merge two object schemas", async () => {
    const schemaA = s.object({ a: s.string });
    const schemaB = s.object({ b: s.number });
    const intersectionSchema = s.intersection(schemaA, schemaB);

    const data = { a: "hello", b: 123 };
    const result = await validate(intersectionSchema, data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(data);
    }
  });

  it("should fail if the first schema fails", async () => {
    const schemaA = s.object({ a: s.string });
    const schemaB = s.object({ b: s.number });
    const intersectionSchema = s.intersection(schemaA, schemaB);

    const data = { a: 123, b: 456 }; // 'a' is wrong type
    // @ts-expect-error
    const result = await validate(intersectionSchema, data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0].path).toEqual(["a"]);
      expect(result.error[0].message).toBe("Expected string, received number");
    }
  });

  it("should fail if the second schema fails", async () => {
    const schemaA = s.object({ a: s.string });
    const schemaB = s.object({ b: s.number });
    const intersectionSchema = s.intersection(schemaA, schemaB);

    const data = { a: "hello", b: "world" }; // 'b' is wrong type
    // @ts-expect-error
    const result = await validate(intersectionSchema, data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(1);
      expect(result.error[0].path).toEqual(["b"]);
      expect(result.error[0].message).toBe("Expected number, received string");
    }
  });

  it("should fail and report errors from both schemas", async () => {
    const schemaA = s.object({ a: s.string });
    const schemaB = s.object({ b: s.number });
    const intersectionSchema = s.intersection(schemaA, schemaB);

    const data = { a: 123, b: "world" }; // both are wrong
    // @ts-expect-error
    const result = await validate(intersectionSchema, data);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(2);
      // The order isn't guaranteed, so check for both
      expect(result.error).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["a"],
            message: "Expected string, received number",
          }),
          expect.objectContaining({
            path: ["b"],
            message: "Expected number, received string",
          }),
        ])
      );
    }
  });

  it("should handle overlapping properties by taking the right-hand side", async () => {
    const schemaA = s.object({ a: s.string });
    const schemaB = s.object({ a: s.number }); // Overlapping property
    const intersectionSchema = s.intersection(schemaA, schemaB);

    // This should fail because the merged schema is effectively s.object({ a: s.number })
    const data = { a: "should be a number" };
    const result = await validate(intersectionSchema, data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error[0].message).toBe("Expected number, received string");
    }

    const data2 = { a: 123 };
    const result2 = await validate(intersectionSchema, data2);
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data).toEqual({ a: 123 });
    }
  });
});
