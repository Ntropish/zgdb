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

    expect(result).toMatchSnapshot();
  });
});
