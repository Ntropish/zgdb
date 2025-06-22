import { s, validate } from "../s";

describe("TSMK Schema", () => {
  describe("s.string", () => {
    const stringSchema = s.string;

    it("should succeed for a valid string", async () => {
      const result = await validate(stringSchema, "hello world");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello world");
      }
    });

    it("should fail for a non-string value", async () => {
      const result = await validate(stringSchema, 123 as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveLength(1);
        expect(result.error[0].message).toBe(
          "Expected string, received number"
        );
      }
    });
  });

  describe("s(s.string, s.minLength(5))", () => {
    const minLengthSchema = s(s.string, s.minLength(5));

    it("should succeed for a string longer than 5 chars", async () => {
      const result = await validate(minLengthSchema, "hello world");
      expect(result.success).toBe(true);
    });

    it("should fail for a string shorter than 5 chars", async () => {
      const result = await validate(minLengthSchema, "hi");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveLength(1);
        expect(result.error[0].message).toContain("at least 5 characters");
      }
    });
  });

  describe("s.number", () => {
    const numberSchema = s.number;

    it("should succeed for a valid number", async () => {
      const result = await validate(numberSchema, 42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it("should fail for a non-number value", async () => {
      const result = await validate(numberSchema, "not a number" as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveLength(1);
        expect(result.error[0].message).toBe(
          "Expected number, received string"
        );
      }
    });
  });

  describe("s(s.number, s.positive(), s.max(10))", () => {
    const numberSchema = s(s.number, s.positive(), s.max(10));

    it("should succeed for a valid number", async () => {
      const result = await validate(numberSchema, 5);
      expect(result.success).toBe(true);
    });

    it("should fail for a negative number", async () => {
      const result = await validate(numberSchema, -5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe("Number must be positive.");
      }
    });

    it("should fail for a number greater than 10", async () => {
      const result = await validate(numberSchema, 11);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe("Number must be at most 10.");
      }
    });
  });

  describe("s.object()", () => {
    const userSchema = s.object({
      name: s(s.string, s.minLength(3)),
      email: s.string, // a simple schema
      age: s(s.number, s.positive()),
    });

    it("should succeed with a valid user object", async () => {
      const result = await validate(userSchema, {
        name: "John Doe",
        email: "john.doe@example.com",
        age: 30,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          name: "John Doe",
          email: "john.doe@example.com",
          age: 30,
        });
      }
    });

    it("should fail with multiple issues for an invalid object", async () => {
      const result = await validate(userSchema, {
        name: "Jo", // Too short
        email: "john.doe@example.com",
        age: -5, // Not positive
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveLength(2);
        const nameError = result.error.find((e) => e.path?.[0] === "name");
        const ageError = result.error.find((e) => e.path?.[0] === "age");
        expect(nameError).toBeDefined();
        expect(ageError).toBeDefined();
        expect(nameError?.message).toContain("at least 3 characters");
        expect(ageError?.message).toBe("Number must be positive.");
      }
    });

    it("should fail for a non-object value", async () => {
      const result = await validate(userSchema, "not an object" as any);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe(
          "Expected object, received string"
        );
      }
    });
  });

  describe("s.array()", () => {
    it("should succeed with a valid array of strings", async () => {
      const stringArraySchema = s.array(s.string);
      const result = await validate(stringArraySchema, ["a", "b", "c"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(["a", "b", "c"]);
      }
    });

    it("should fail if an element is invalid", async () => {
      const stringArraySchema = s.array(s(s.string, s.minLength(2)));
      const result = await validate(stringArraySchema, ["aa", "b", "cc"]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveLength(1);
        expect(result.error[0].path).toEqual([1]);
        expect(result.error[0].message).toContain("at least 2 characters");
      }
    });

    it("should handle arrays of objects", async () => {
      const userArraySchema = s.array(
        s.object({ name: s.string, age: s.number })
      );
      const result = await validate(userArraySchema, [
        { name: "John", age: 30 },
        { name: "Jane", age: "thirty-one" as any }, // Invalid age
      ]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toHaveLength(1);
        expect(result.error[0].path).toEqual([1, "age"]); // Correctly nested path
        expect(result.error[0].message).toBe(
          "Expected number, received string"
        );
      }
    });
  });

  describe("Coercion", () => {
    describe("s.coerce.string", () => {
      it("should coerce a number to a string", async () => {
        const result = await validate(s.coerce.string, 123);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe("123");
        }
      });

      it("can be extended with further validations", async () => {
        const schema = s(s.coerce.string, s.minLength(5));
        const result = await validate(schema, 12345);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe("12345");
        }
      });
    });

    describe("s.coerce.number", () => {
      it("should coerce a string to a number", async () => {
        const result = await validate(s.coerce.number, "123.45");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(123.45);
        }
      });

      it("should fail for a non-numeric string", async () => {
        const result = await validate(s.coerce.number, "abc" as any);
        expect(result.success).toBe(false);
      });
    });

    describe("s.coerce.boolean", () => {
      it("should coerce 'true' to true", async () => {
        const result = await validate(s.coerce.boolean, "true");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(true);
        }
      });

      it("should coerce a non-zero number to true", async () => {
        const result = await validate(s.coerce.boolean, 123);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(true);
        }
      });
    });

    describe("s.coerce.bigint", () => {
      it("should coerce a numeric string to a bigint", async () => {
        const result = await validate(s.coerce.bigint, "12345678901234567890");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(12345678901234567890n);
        }
      });

      it("should fail for a non-integer string", async () => {
        const result = await validate(s.coerce.bigint, "123.45" as any);
        expect(result.success).toBe(false);
      });
    });
  });

  describe("s.literal()", () => {
    it("should succeed for a correct literal", async () => {
      const schema = s.literal("hello");
      const result = await validate(schema, "hello");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("hello");
    });

    it("should fail for an incorrect literal", async () => {
      const schema = s.literal("hello");
      const result = await validate(schema, "world");
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error[0].message).toContain(
          'Expected literal value "hello"'
        );
    });
  });

  describe("s.enum()", () => {
    const schema = s.enum(["admin", "user", "guest"]);
    it("should succeed for a value in the enum", async () => {
      const result = await validate(schema, "user");
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe("user");
    });

    it("should fail for a value not in the enum", async () => {
      const result = await validate(schema, "root");
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error[0].message).toContain(
          'Expected one of ["admin", "user", "guest"]'
        );
    });

    it("should handle complex enums", async () => {
      const complexEnum = s.enum([1, "a", { b: 2 }]);
      const result1 = await validate(complexEnum, { b: 2 });
      expect(result1.success).toBe(true);

      const result2 = await validate(complexEnum, { b: 3 });
      expect(result2.success).toBe(false);
    });
  });

  describe("s.void", () => {
    it("should succeed for undefined", async () => {
      const result = await validate(s.void, undefined);
      expect(result.success).toBe(true);
    });
  });

  describe("Complex Literals", () => {
    it("should handle object literals", async () => {
      const schema = s.literal({ a: 1, b: { c: "hello" } });
      const result = await validate(schema, { a: 1, b: { c: "hello" } });
      expect(result.success).toBe(true);

      const result2 = await validate(schema, { a: 1, b: { c: "world" } });
      expect(result2.success).toBe(false);
    });

    it("should handle array literals", async () => {
      const schema = s.literal([1, { a: 2 }]);
      const result = await validate(schema, [1, { a: 2 }]);
      expect(result.success).toBe(true);

      const result2 = await validate(schema, [1, { a: 3 }]);
      expect(result2.success).toBe(false);
    });
  });
});
