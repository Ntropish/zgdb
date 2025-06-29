import { describe, it, expect } from "vitest";
import { CollectionClassGenerator } from "../../generators/collection-class-generator.js";
import { NormalizedSchema } from "../../../parser/types.js";

const testSchema: NormalizedSchema[] = [
  {
    name: "User",
    fields: [
      { name: "id", type: "string", required: true, attributes: new Map() },
      {
        name: "displayName",
        type: "string",
        required: true,
        attributes: new Map(),
      },
      {
        name: "createdAt",
        type: "long",
        required: true,
        attributes: new Map(),
      },
    ],
    indexes: [],
    relationships: [],
    manyToMany: [],
  },
];

describe("CollectionClassGenerator", () => {
  it("should generate correct collection classes", () => {
    const generator = new CollectionClassGenerator();
    const result = generator.generate(testSchema);
    expect(result).toMatchSnapshot();
  });
});
