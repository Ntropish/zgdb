import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

describe("fbs-builder-extended", () => {
  it("should build a complex fbs file with all features", async () => {
    const builder = createFbsBuilder();

    // Configure the schema using the fluent API
    builder.namespace("MyGame.Sample");
    builder.include("other_definitions.fbs");

    builder
      .enum("Color", "ubyte")
      .docs("An enum for colors")
      .value("Red", 1)
      .value("Green", 2)
      .value("Blue", 3);

    builder
      .struct("Vec3")
      .docs("A simple 3D vector.")
      .field("x", "float")
      .field("y", "float")
      .field("z", "float");

    builder
      .union("Any")
      .docs("A union of all possible components.")
      .value("Monster")
      .value("Weapon");

    const monsterTable = builder.table("Monster");
    monsterTable
      .docs("A monster in the game.")
      .attribute("priority", "1")
      .field("pos", "Vec3")
      .field("hp", "short", { defaultValue: 100 })
      .field("name", "string", { attributes: { required: true } })
      .field("inventory", "ubyte", { isVector: true })
      .field("color", "Color", { defaultValue: "Blue" })
      .field("friends", "Monster", { isVector: true })
      .field("equipped", "Any");

    builder.table("Weapon").field("name", "string").field("damage", "short");

    builder.root_type("Monster");
    builder.file_identifier("MONS");
    builder.file_extension("mon");

    // Create the initial state
    const initialState = createInitialFbsFileState();

    // Execute the build pipeline
    const finalState = await builder.build(initialState);

    // Render the final state to a string
    const result = renderFbs(finalState);

    const expected = `namespace MyGame.Sample;
include "other_definitions.fbs";

/// An enum for colors
enum Color: ubyte {
  Red = 1,
  Green = 2,
  Blue = 3,
}

/// A simple 3D vector.
struct Vec3 {
  x: float;
  y: float;
  z: float;
}

/// A union of all possible components.
union Any {
  Monster,
  Weapon,
}

/// A monster in the game.
table Monster (priority: "1") {
  pos: Vec3;
  hp: short = 100;
  name: string (required);
  inventory: [ubyte];
  color: Color = "Blue";
  friends: [Monster];
  equipped: Any;
}

table Weapon {
  name: string;
  damage: short;
}

root_type Monster;
file_identifier "MONS";
file_extension "mon";
`;

    // Using .trim() to remove leading/trailing whitespace and comparing
    // line by line after splitting to avoid OS-specific newline issues.
    expect(result.trim().split(/\\r?\\n/)).toEqual(
      expected.trim().split(/\\r?\\n/)
    );
  });
});
