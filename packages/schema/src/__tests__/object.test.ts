import { s, validate } from "../s";

describe("Object Schema", () => {
  const userSchema = s.object({
    name: s.string,
    age: s.number,
  });

  describe("s.object()", () => {
    it("should succeed with a valid user object", async () => {
      const result = await validate(userSchema, {
        name: "John Doe",
        age: 30,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          name: "John Doe",
          age: 30,
        });
      }
    });

    it("should fail if a property is missing", async () => {
      const result = await validate(userSchema, { name: "John Doe" } as any);
      expect(result.success).toBe(false);
    });
  });

  describe(".partial()", () => {
    const partialUserSchema = userSchema.partial();

    it("should succeed if all properties are present", async () => {
      const result = await validate(partialUserSchema, {
        name: "John Doe",
        age: 30,
      });
      expect(result.success).toBe(true);
    });

    it("should succeed if a property is missing", async () => {
      const result = await validate(partialUserSchema, { name: "John Doe" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.age).toBeUndefined();
      }
    });

    it("should succeed with no properties", async () => {
      const result = await validate(partialUserSchema, {});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
        expect(result.data.age).toBeUndefined();
      }
    });
  });

  describe(".extend()", () => {
    const extendedSchema = userSchema.extend({
      isAdmin: s.boolean,
    });

    it("should succeed with the extended shape", async () => {
      const result = await validate(extendedSchema, {
        name: "John Doe",
        age: 30,
        isAdmin: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isAdmin).toBe(true);
      }
    });

    it("should fail if the extended property is missing", async () => {
      const result = await validate(extendedSchema, {
        name: "John Doe",
        age: 30,
      } as any);
      expect(result.success).toBe(false);
    });

    it("should fail if the original property is missing", async () => {
      const result = await validate(extendedSchema, {
        age: 30,
        isAdmin: true,
      } as any);
      expect(result.success).toBe(false);
    });
  });

  describe(".pick()", () => {
    const pickedSchema = userSchema.pick({ name: true });

    it("should succeed with only the picked properties", async () => {
      const result = await validate(pickedSchema, { name: "John Doe" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John Doe" });
      }
    });

    it("should fail if a picked property is missing", async () => {
      const result = await validate(pickedSchema, {} as any);
      expect(result.success).toBe(false);
    });

    it("should ignore unpicked properties", async () => {
      const result = await validate(pickedSchema, {
        name: "John Doe",
        age: 30,
      } as any);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John Doe" });
        expect((result.data as any).age).toBeUndefined();
      }
    });
  });

  describe(".omit()", () => {
    const omittedSchema = userSchema.omit({ age: true });

    it("should succeed with the omitted properties removed", async () => {
      const result = await validate(omittedSchema, { name: "John Doe" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John Doe" });
      }
    });

    it("should fail if a non-omitted property is missing", async () => {
      const result = await validate(omittedSchema, { age: 30 } as any);
      expect(result.success).toBe(false);
    });

    it("should succeed if the omitted property is also passed", async () => {
      const result = await validate(omittedSchema, {
        name: "John Doe",
        age: 30,
      } as any);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John Doe" });
        expect((result.data as any).age).toBeUndefined();
      }
    });
  });
});
