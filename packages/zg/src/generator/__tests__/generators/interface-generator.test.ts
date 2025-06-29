import { describe, it, expect } from "vitest";
import { InterfaceGenerator } from "../../generators/interface-generator.js";
import { NormalizedSchema } from "../../../parser/types.js";

describe("InterfaceGenerator", () => {
  it("should generate correct interfaces for given schemas", () => {
    const generator = new InterfaceGenerator();
    const schemas: NormalizedSchema[] = [
      {
        name: "User",
        fields: [
          { name: "id", type: "string", required: true, attributes: new Map() },
          { name: "age", type: "long", required: true, attributes: new Map() },
          {
            name: "isActive",
            type: "bool",
            required: false,
            attributes: new Map(),
          },
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
