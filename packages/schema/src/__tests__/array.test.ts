import { s, validate } from "../s";

describe("Array Schemas", () => {
  it("should validate an array of numbers", async () => {
    const schema = s.array(s.number);
    const result = await validate(schema, [1, 2, 3]);
    expect(result.success).toBe(true);
  });

  it("should fail for an array with non-number elements", async () => {
    const schema = s.array(s.number);
    const result = await validate(schema, [1, "2", 3]);
    expect(result.success).toBe(false);
  });

  it("should validate an array of objects", async () => {
    const schema = s.array(
      s.object({
        name: s.string,
        age: s.number,
      })
    );
    const result = await validate(schema, [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    expect(result.success).toBe(true);
  });

  it("should fail for an array with invalid objects", async () => {
    const schema = s.array(
      s.object({
        name: s.string,
        age: s.number,
      })
    );
    const result = await validate(schema, [
      { name: "Alice", age: 30 },
      { name: "Bob", age: "25" },
    ]);
    expect(result.success).toBe(false);
  });

  it("should validate a nested array", async () => {
    const schema = s.array(s.array(s.number));
    const result = await validate(schema, [
      [1, 2],
      [3, 4],
    ]);
    expect(result.success).toBe(true);
  });

  it("should fail for a nested array with invalid elements", async () => {
    const schema = s.array(s.array(s.number));
    const result = await validate(schema, [
      [1, 2],
      [3, "4"],
    ]);
    expect(result.success).toBe(false);
  });
});
