import { describe, it, expect } from "vitest";
import { ZgFileGenerator } from "../zg-file-generator.js";
import { NormalizedSchema } from "../../parser/types.js";

const testSchema: NormalizedSchema[] = [
  {
    name: "User",
    fields: [
      { name: "id", type: "ID", required: true, attributes: new Map() },
      { name: "name", type: "string", required: true, attributes: new Map() },
    ],
    indexes: [],
    relationships: [
      {
        name: "posts",
        node: "Post",
        cardinality: "many",
        mappedBy: "author",
      },
    ],
    manyToMany: [],
  },
  {
    name: "Post",
    fields: [
      { name: "id", type: "ID", required: true, attributes: new Map() },
      { name: "title", type: "string", required: true, attributes: new Map() },
      { name: "authorId", type: "ID", required: true, attributes: new Map() },
    ],
    indexes: [],
    relationships: [
      {
        name: "author",
        node: "User",
        cardinality: "one",
        foreignKey: "authorId",
      },
    ],
    manyToMany: [],
  },
];

describe("ZgFileGenerator", () => {
  it("should generate a complete schema file from all sub-generators", () => {
    const generator = new ZgFileGenerator();
    const result = generator.generate(testSchema);
    expect(result).toMatchSnapshot();
  });
});
