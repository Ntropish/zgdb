import { describe, it, expect } from "vitest";
import { NodeClassGenerator } from "../../generators/node-class-generator.js";
import { NormalizedSchema } from "../../../parser/types.js";

const simpleSchema: NormalizedSchema[] = [
  {
    name: "User",
    fields: [
      { name: "id", type: "ID", required: true, attributes: new Map() },
      { name: "name", type: "string", required: true, attributes: new Map() },
      { name: "age", type: "int", required: false, attributes: new Map() },
    ],
    indexes: [],
    relationships: [],
    manyToMany: [],
  },
];

const relationshipSchema: NormalizedSchema[] = [
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

describe("NodeClassGenerator", () => {
  it("should generate correct node classes for a simple schema", () => {
    const generator = new NodeClassGenerator();
    const result = generator.generate(simpleSchema);
    expect(result).toMatchSnapshot();
  });

  it("should generate correct node classes for a schema with relationships", () => {
    const generator = new NodeClassGenerator();
    const result = generator.generate(relationshipSchema);
    expect(result).toMatchSnapshot();
  });
});
