import { describe, it, expect } from "vitest";
import { ImportGenerator } from "../../generators/import-generator.js";
import { NormalizedSchema } from "../../../parser/types.js";

describe("ImportGenerator", () => {
  it("should generate correct import statements for given schemas", () => {
    const generator = new ImportGenerator();
    const schemas: NormalizedSchema[] = [
      { name: "User", fields: [], isJoinTable: false },
      { name: "Post", fields: [], isJoinTable: false },
      { name: "UserPostLink", fields: [], isJoinTable: true },
    ];

    const result = generator.generate(schemas);
    expect(result).toMatchSnapshot();
  });

  it("should use the specified import extension", () => {
    const generator = new ImportGenerator();
    const schemas: NormalizedSchema[] = [
      { name: "Product", fields: [], isJoinTable: false },
    ];

    const result = generator.generate(schemas, { importExtension: ".mjs" });
    expect(result).toMatchSnapshot();
  });
});
