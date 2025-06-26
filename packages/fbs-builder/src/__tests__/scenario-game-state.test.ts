import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";
import { runFlatc } from "./test-utils.js";

describe("Scenario Test: The Chronicles of Eldoria - Player Save State", () => {
  it("should generate a schema for a complex player save file", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: A save-game format for a fantasy RPG. The format needs to
     * be robust and support complex, nested data structures, including a
     * player's stats, their 3D position in the world, and a polymorphic
     * inventory system that can hold different types of items (weapons,
     * armor, potions, etc.).
     *
     * FEATURES TESTED:
     * - A `struct` for a simple, fixed-layout data structure (`Vec3`).
     * - A `union` for polymorphic data (`InventoryItem`).
     * - A `table` (`Player`) that contains other tables, structs, and unions.
     * - Vectors of tables (`[InventoryItem]`).
     */

    builder.namespace("Eldoria.SaveGame");

    // A simple struct for 3D coordinates.
    builder
      .struct("Vec3")
      .docs("A 3D vector for representing positions or directions.")
      .field("x", "float")
      .field("y", "float")
      .field("z", "float");

    // -- INVENTORY ITEM TYPES --
    builder
      .table("Weapon")
      .field("id", "string")
      .field("damage", "short")
      .field("speed", "float");
    builder
      .table("Armor")
      .field("id", "string")
      .field("defense", "short")
      .field("weight", "float");
    builder.table("Potion").field("id", "string").field("effect", "string");

    // The union that allows the inventory to hold any of the item types.
    builder
      .union("InventoryItem")
      .docs("A union of all possible items a player can have.")
      .value("Weapon")
      .value("Armor")
      .value("Potion");

    // -- PLAYER DATA --
    builder
      .table("PlayerStats")
      .field("hp", "int")
      .field("max_hp", "int")
      .field("mana", "int")
      .field("max_mana", "int")
      .field("level", "ubyte");

    // The root table for the player's save state.
    builder
      .table("Player")
      .field("name", "string")
      .field("position", "Vec3")
      .field("stats", "PlayerStats")
      .field("inventory", "InventoryItem", { isVector: true });

    builder.root_type("Player");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();

    // It should also be a valid FlatBuffers schema.
    await runFlatc(result, "game_state.fbs");
  });
});
