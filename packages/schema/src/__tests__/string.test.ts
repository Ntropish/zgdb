import { s, validate } from "../s";

describe("String Schema", () => {
  describe("Validators", () => {
    it("maxLength", async () => {
      const schema = s(s.string, s.maxLength(5));
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "hell")).success).toBe(true);
      expect((await validate(schema, "helloo")).success).toBe(false);
    });

    it("exactLength", async () => {
      const schema = s(s.string, s.exactLength(5));
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "hell")).success).toBe(false);
      expect((await validate(schema, "helloo")).success).toBe(false);
    });

    it("regex", async () => {
      const schema = s(s.string, s.regex(/^[a-z]+$/));
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "HELLO")).success).toBe(false);
      expect((await validate(schema, "123")).success).toBe(false);
    });

    it("includes", async () => {
      const schema = s(s.string, s.includes("ell"));
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "hallo")).success).toBe(false);
    });

    it("startsWith", async () => {
      const schema = s(s.string, s.startsWith("he"));
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "world")).success).toBe(false);
    });

    it("endsWith", async () => {
      const schema = s(s.string, s.endsWith("lo"));
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "hell")).success).toBe(false);
    });

    it("uppercase", async () => {
      const schema = s(s.string, s.uppercase());
      expect((await validate(schema, "HELLO")).success).toBe(true);
      expect((await validate(schema, "hello")).success).toBe(false);
    });

    it("lowercase", async () => {
      const schema = s(s.string, s.lowercase());
      expect((await validate(schema, "hello")).success).toBe(true);
      expect((await validate(schema, "HELLO")).success).toBe(false);
    });

    it("should validate a string that includes a substring", async () => {
      const schema = s(s.string, s.includes("world"));
      const result = await validate(schema, "hello world");
      expect(result.success).toBe(true);
    });

    it("should fail for a string that does not include a substring", async () => {
      const schema = s(s.string, s.includes("world"));
      const result = await validate(schema, "hello universe");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe('String must include "world".');
      }
    });

    it("should validate a string that starts with a substring", async () => {
      const schema = s(s.string, s.startsWith("hello"));
      const result = await validate(schema, "hello world");
      expect(result.success).toBe(true);
    });

    it("should fail for a string that does not start with a substring", async () => {
      const schema = s(s.string, s.startsWith("world"));
      const result = await validate(schema, "hello world");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe('String must start with "world".');
      }
    });

    it("should validate a string that ends with a substring", async () => {
      const schema = s(s.string, s.endsWith("world"));
      const result = await validate(schema, "hello world");
      expect(result.success).toBe(true);
    });

    it("should fail for a string that does not end with a substring", async () => {
      const schema = s(s.string, s.endsWith("hello"));
      const result = await validate(schema, "hello world");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error[0].message).toBe('String must end with "hello".');
      }
    });
  });

  describe("Format Validators", () => {
    it("email", async () => {
      const schema = s(s.string, s.email);
      expect((await validate(schema, "test@example.com")).success).toBe(true);
      expect((await validate(schema, "invalid-email")).success).toBe(false);
    });

    it("uuid", async () => {
      const schema = s(s.string, s.uuid);
      expect(
        (await validate(schema, "123e4567-e89b-12d3-a456-426614174000")).success
      ).toBe(true);
      expect((await validate(schema, "not-a-uuid")).success).toBe(false);
    });

    it("url", async () => {
      const schema = s(s.string, s.url);
      expect((await validate(schema, "https://example.com")).success).toBe(
        true
      );
      expect((await validate(schema, "not a url")).success).toBe(false);
    });

    it("cuid", async () => {
      const schema = s(s.string, s.cuid);
      const result = await validate(schema, "cjld2cjxh0000qzrmn831i7rn");
      expect(result.success).toBe(true);
      expect((await validate(schema, "not-a-cuid")).success).toBe(false);
    });

    it("cuid2", async () => {
      const schema = s(s.string, s.cuid2);
      const result = await validate(schema, "tz4a98xxat96iws9zmbrgj3a");
      expect(result.success).toBe(true);
      expect((await validate(schema, "not-a-cuid2")).success).toBe(false);
    });

    it("ulid", async () => {
      const schema = s(s.string, s.ulid);
      const result = await validate(schema, "01H8XGJWBWBAQW6VVC14W45G1Z");
      expect(result.success).toBe(true);
      expect((await validate(schema, "not-a-ulid")).success).toBe(false);
    });

    it("nanoid", async () => {
      const schema = s(s.string, s.nanoid, s.exactLength(21));
      expect((await validate(schema, "V1StGXR8_Z5jdHi6B-myT")).success).toBe(
        true
      );
      expect((await validate(schema, "invalid-nanoid-too-long")).success).toBe(
        false
      );
    });

    it("datetime", async () => {
      const schema = s(s.string, s.datetime);
      expect((await validate(schema, "2020-01-01T00:00:00.000Z")).success).toBe(
        true
      );
      expect((await validate(schema, "2020-01-01T00:00:00Z")).success).toBe(
        true
      );
      expect(
        (await validate(schema, "2020-01-01T00:00:00+02:00")).success
      ).toBe(true);
      expect((await validate(schema, "not-a-datetime")).success).toBe(false);
    });

    it("ip", async () => {
      const schema = s(s.string, s.ip());
      expect((await validate(schema, "192.168.1.1")).success).toBe(true);
      expect(
        (await validate(schema, "2001:0db8:85a3:0000:0000:8a2e:0370:7334"))
          .success
      ).toBe(true);
      expect((await validate(schema, "not-an-ip")).success).toBe(false);

      const ipv4Schema = s(s.string, s.ip({ version: "v4" }));
      expect((await validate(ipv4Schema, "192.168.1.1")).success).toBe(true);
      expect(
        (await validate(ipv4Schema, "2001:0db8:85a3:0000:0000:8a2e:0370:7334"))
          .success
      ).toBe(false);

      const ipv6Schema = s(s.string, s.ip({ version: "v6" }));
      expect((await validate(ipv6Schema, "192.168.1.1")).success).toBe(false);
      expect(
        (await validate(ipv6Schema, "2001:0db8:85a3:0000:0000:8a2e:0370:7334"))
          .success
      ).toBe(true);
    });
  });

  describe("Transforms", () => {
    it("trim", async () => {
      const schema = s(s.string, s.transform.trim, s.exactLength(5));
      const result = await validate(schema, "  hello  ");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello");
      }
    });

    it("toLowerCase", async () => {
      const schema = s(s.string, s.transform.toLowerCase, s.lowercase());
      const result = await validate(schema, "HELLO");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("hello");
      }
    });

    it("toUpperCase", async () => {
      const schema = s(s.string, s.transform.toUpperCase, s.uppercase());
      const result = await validate(schema, "hello");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("HELLO");
      }
    });
  });
});
