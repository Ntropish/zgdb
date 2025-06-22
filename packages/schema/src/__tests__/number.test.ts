import { s, validate } from "../s";

describe("Number Schema", () => {
  describe("Validators", () => {
    it("gt", async () => {
      const schema = s(s.number, s.gt(5));
      expect((await validate(schema, 6)).success).toBe(true);
      expect((await validate(schema, 5)).success).toBe(false);
      expect((await validate(schema, 4)).success).toBe(false);
    });

    it("lt", async () => {
      const schema = s(s.number, s.lt(5));
      expect((await validate(schema, 4)).success).toBe(true);
      expect((await validate(schema, 5)).success).toBe(false);
      expect((await validate(schema, 6)).success).toBe(false);
    });

    it("int", async () => {
      const schema = s(s.number, s.int());
      expect((await validate(schema, 5)).success).toBe(true);
      expect((await validate(schema, 5.5)).success).toBe(false);
    });

    it("multipleOf", async () => {
      const schema = s(s.number, s.multipleOf(5));
      expect((await validate(schema, 10)).success).toBe(true);
      expect((await validate(schema, 7)).success).toBe(false);
    });

    it("should chain multiple validators", async () => {
      const schema = s(s.number, s.int(), s.gt(0), s.multipleOf(2));
      const result = await validate(schema, 10);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(10);
      }

      const failedResult1 = await validate(schema, 9); // Fails multipleOf
      expect(failedResult1.success).toBe(false);

      const failedResult2 = await validate(schema, 10.5); // Fails int
      expect(failedResult2.success).toBe(false);

      const failedResult3 = await validate(schema, -2); // Fails gt
      expect(failedResult3.success).toBe(false);
    });

    it("should validate a positive number", async () => {
      const schema = s(s.number, s.positive());
      const result = await validate(schema, 5);
      expect(result.success).toBe(true);
    });

    it("should fail for a non-positive number", async () => {
      const schema = s(s.number, s.positive());
      const result = await validate(schema, -5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe("Number must be positive.");
      }
    });

    it("should validate a negative number", async () => {
      const schema = s(s.number, s.negative());
      const result = await validate(schema, -5);
      expect(result.success).toBe(true);
    });

    it("should fail for a non-negative number", async () => {
      const schema = s(s.number, s.negative());
      const result = await validate(schema, 5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe("Number must be less than 0.");
      }
    });

    it("should validate a number within a min/max range", async () => {
      const schema = s(s.number, s.min(5), s.max(10));
      const result = await validate(schema, 7);
      expect(result.success).toBe(true);
    });

    it("should fail for a number below the min", async () => {
      const schema = s(s.number, s.min(5), s.max(10));
      const result = await validate(schema, 4);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe("Number must be at least 5.");
      }
    });

    it("should fail for a number above the max", async () => {
      const schema = s(s.number, s.min(5), s.max(10));
      const result = await validate(schema, 11);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe("Number must be at most 10.");
      }
    });
  });
});
