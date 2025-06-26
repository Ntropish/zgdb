import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

describe("Scenario Test: The Chronicles of Eldoria - Player Save State", () => {
  it("should generate a schema for a complex player save file", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: We are building the save file format for a fantasy RPG, "The
     * Chronicles of Eldoria". A player's save state needs to store their
     * character's stats, inventory, equipped items, and current location.
     * The inventory can contain various items like weapons, armor, or
     * potions, each with different properties.
     *
     * FEATURES TESTED:
     * - `namespace` to prevent type collisions.
     * - `struct` for simple, fixed-size data (Position).
     * - `enum` for character classes.
     * - `union` for a heterogeneous list of items.
     * - `table` for complex, extensible objects.
     * - `vector` of unions for the inventory.
     * - `root_type` and `file_identifier` for the save file format.
     */

    builder.namespace("Eldoria.Saves");
    builder.file_identifier("EPSA"); // Eldoria Player Save

    // A simple struct for 3D coordinates. Structs are ideal for
    // simple, fixed-size data that won't change.
    builder
      .struct("Position")
      .docs("A simple 3D position in the game world.")
      .field("x", "float")
      .field("y", "float")
      .field("z", "float");

    // An enum for the player's class.
    builder
      .enum("CharacterClass", "ubyte")
      .docs("Enumerates the possible character classes.")
      .value("Warrior", 0)
      .value("Mage", 1)
      .value("Archer", 2);

    // Tables for the different types of items a player can have.
    builder
      .table("Weapon")
      .docs("Represents a weapon with damage and elemental attributes.")
      .field("damage", "short")
      .field("elemental_type", "string");

    builder
      .table("Armor")
      .docs("Represents a piece of armor with defense points.")
      .field("defense", "short");

    builder
      .table("Potion")
      .docs("A consumable potion with a specific effect.")
      .field("effect", "string")
      .field("duration_seconds", "int");

    // A union represents a value that can be one of several table types.
    // This is perfect for our inventory, which can hold different items.
    builder
      .union("InventoryItem")
      .docs("A union that can hold any type of inventory item.")
      .value("Weapon")
      .value("Armor")
      .value("Potion");

    // The main table for the player's state. This is the root of our schema.
    builder
      .table("PlayerState")
      .docs("The root table for a player's save data.")
      .field("name", "string", { attributes: { required: true } })
      .field("character_class", "CharacterClass", { defaultValue: "Warrior" })
      .field("hp", "int")
      .field("mana", "int")
      .field("pos", "Position") // Embedding our struct
      .field("inventory", "InventoryItem", { isVector: true }); // A vector of our union

    // Finally, we declare the root type for this schema.
    builder.root_type("PlayerState");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();
  });
});
