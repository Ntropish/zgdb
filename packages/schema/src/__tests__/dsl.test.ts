import { s, t, validate } from "../index";

describe("Schema DSL", () => {
  it("should correctly parse a complex object schema from a YAML-like DSL string", async () => {
    const MagicalItemSchema = t`
      name: { type: string, minLength: 3 }
      potency: { type: number, positive: true }
      isCursed?: boolean
    `;

    const CharacterSchema = t`
      name: { type: string, minLength: 2, maxLength: 50 }
      class: string
      level: { type: number, int: true, min: 1, max: 100 }
      inventory:
        - name: string
          quantity: { type: number, int: true, min: 1 }
          description?: string
      stats:
        strength: number
        dexterity: number
        intelligence: number
        wisdom: number
        charisma: number
      primaryWeapon: ${MagicalItemSchema}
    `;

    const validCharacter = {
      name: "Arion",
      class: "Wizard",
      level: 15,
      inventory: [
        { name: "Health Potion", quantity: 10, description: "Restores 50 HP." },
      ],
      stats: {
        strength: 8,
        dexterity: 12,
        intelligence: 20,
        wisdom: 18,
        charisma: 14,
      },
      primaryWeapon: {
        name: "Staff of the Magi",
        potency: 10,
        isCursed: false,
      },
    };

    const result = await validate(CharacterSchema, validCharacter);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validCharacter);
    }
  });
});
