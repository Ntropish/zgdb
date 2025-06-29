import { describe, it, expect } from "vitest";
import { ClientGenerator } from "../../generators/client-generator.js";
import { NormalizedSchema } from "../../../parser/types.js";

const testSchema: NormalizedSchema[] = [
  {
    name: "User",
    fields: [],
    indexes: [],
    relationships: [],
    manyToMany: [],
  },
  {
    name: "Post",
    fields: [],
    indexes: [],
    relationships: [],
    manyToMany: [],
  },
  {
    name: "Comment",
    fields: [],
    indexes: [],
    relationships: [],
    manyToMany: [],
    isJoinTable: true, // Should be ignored
  },
];

describe("ClientGenerator", () => {
  it("should generate a ZgClient class with collections for each schema", () => {
    const generator = new ClientGenerator();
    const result = generator.generate(testSchema);
    expect(result).toMatchSnapshot();
  });
});
