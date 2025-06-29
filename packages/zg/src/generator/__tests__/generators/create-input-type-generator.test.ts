import { describe, it, expect } from "vitest";
import { CreateInputTypeGenerator } from "../../generators/create-input-type-generator.js";
import { NormalizedSchema } from "../../../parser/types.js";

describe("CreateInputTypeGenerator", () => {
  it("should generate correct create input types for given schemas", () => {
    const generator = new CreateInputTypeGenerator();
    const schemas: NormalizedSchema[] = [
      {
        name: "User",
        fields: [
          { name: "id", type: "string", required: true, attributes: new Map() },
          { name: "age", type: "long", required: true, attributes: new Map() },
        ],
        isJoinTable: false,
        indexes: [],
        relationships: [],
        manyToMany: [],
      },
      {
        name: "UserPostLink",
        fields: [],
        isJoinTable: true,
        indexes: [],
        relationships: [],
        manyToMany: [],
      },
    ];

    const result = generator.generate(schemas);
    expect(result).toMatchSnapshot();
  });
});
