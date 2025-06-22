import { s, t, validate } from "../index";

describe("Galactic Federation Starship Registry", () => {
  const registryIdRegex = /^FED-REG-[A-Z0-9]{4,16}$/;
  const stardateRegex = /^\d{5}\.\d{1,2}$/;

  const CaptainSchema = t`
    name: { type: string, minLength: 2, maxLength: 100 }
    species: { type: string, minLength: 3 }
    homeWorld: string
    serviceYears: { type: number, int: true, min: 0, max: 200 }
  `;

  const WeaponSystemSchema = t`
    type: { type: string } # e.g., "Phaser", "Photon Torpedo"
    powerOutputGigaWatts: { type: number, positive: true }
    rangeKm: { type: number, positive: true, int: true }
    isExperimental?: boolean
  `;

  const StarshipSchema = t`
    registryId: { type: string, regex: ${registryIdRegex} }
    shipName: { type: string, minLength: 2, maxLength: 50 }
    class: { type: string, minLength: 3 }
    commissionDate: { type: string, regex: ${stardateRegex} }
    captain: ${CaptainSchema}
    
    crew:
      - name: string
        position: string
        clearanceLevel: { type: number, int: true, min: 1, max: 10 }
        
    weaponSystems:
      - ${WeaponSystemSchema}

    engine: {
      type: { type: string }, # e.g., "Warp", "Impulse"
      maxSpeed: { type: string } # e.g., "Warp 9.9"
    }
      
    defenses: {
      shields: {
        type: string,
        capacity: { type: number, positive: true }
      },
      hullPlating: {
        material: string,
        thicknessCm: { type: number, positive: true }
      }
    }
        
    metadata: {
      lastMaintenanceStardate: { type: string, regex: ${stardateRegex} },
      starfleetOrder: { type: string, uuid: true },
      notes?: string
    }
  `;

  it("should successfully validate a fully-compliant starship object", async () => {
    const validStarship = {
      registryId: "FED-REG-NCC1701D",
      shipName: "USS Enterprise",
      class: "Galaxy Class",
      commissionDate: "40759.5",
      captain: {
        name: "Jean-Luc Picard",
        species: "Human",
        homeWorld: "Earth",
        serviceYears: 50,
      },
      crew: [
        {
          name: "William T. Riker",
          position: "First Officer",
          clearanceLevel: 9,
        },
        { name: "Data", position: "Second Officer", clearanceLevel: 8 },
        {
          name: "Beverly Crusher",
          position: "Chief Medical Officer",
          clearanceLevel: 8,
        },
      ],
      weaponSystems: [
        {
          type: "Phaser Array",
          powerOutputGigaWatts: 100,
          rangeKm: 300000,
          isExperimental: false,
        },
        {
          type: "Photon Torpedo",
          powerOutputGigaWatts: 2500,
          rangeKm: 1500000,
        },
      ],
      engine: {
        type: "Warp Drive",
        maxSpeed: "Warp 9.6",
      },
      defenses: {
        shields: {
          type: "Deflector Shields",
          capacity: 2700000,
        },
        hullPlating: {
          material: "Duranium",
          thicknessCm: 20,
        },
      },
      metadata: {
        lastMaintenanceStardate: "47622.1",
        starfleetOrder: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        notes:
          "Ship is in excellent condition. Ready for long-range exploration.",
      },
    };

    const result = await validate(StarshipSchema, validStarship);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validStarship);
    }
  });

  it("should fail validation for a starship with data that violates a nested validator", async () => {
    const invalidStarship = {
      registryId: "FED-REG-VALIDID",
      shipName: "USS Enterprise",
      class: "Galaxy Class",
      commissionDate: "40759.5",
      captain: {
        name: "J", // Name too short
        species: "Human",
        homeWorld: "Earth",
        serviceYears: 50,
      },
      crew: [],
      weaponSystems: [],
      engine: { type: "", maxSpeed: "" },
      defenses: {
        shields: { type: "", capacity: 1 },
        hullPlating: { material: "", thicknessCm: 1 },
      },
      metadata: {
        lastMaintenanceStardate: "47622.1",
        starfleetOrder: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      },
    };

    const result = await validate(StarshipSchema, invalidStarship);
    expect(result.success).toBe(false);
    if (!result.success) {
      const captainNameError = result.error.find(
        (e) => e.path?.join(".") === "captain.name"
      );
      expect(captainNameError).toBeDefined();
      expect(captainNameError?.message).toContain("at least 2 characters long");
    }
  });

  it("should fail for multiple validation errors", async () => {
    const invalidStarship = {
      registryId: "FED-REG-SHORT", // ID is fine, but captain name is not
      shipName: "USS Enterprise",
      class: "Galaxy Class",
      commissionDate: "40759.5",
      captain: {
        name: "J", // Name too short
        species: "Human",
        homeWorld: "Earth",
        serviceYears: -5, // service years is negative
      },
      crew: [],
      weaponSystems: [],
      engine: { type: "", maxSpeed: "" },
      defenses: {
        shields: { type: "", capacity: 1 },
        hullPlating: { material: "", thicknessCm: 1 },
      },
      metadata: {
        lastMaintenanceStardate: "47622.1",
        starfleetOrder: "a1b2c3d4-e5f6-7890-1234-567890abcdef",
      },
    };

    const result = await validate(StarshipSchema, invalidStarship);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toHaveLength(2);
      const captainNameError = result.error.find(
        (e) => e.path?.join(".") === "captain.name"
      );
      expect(captainNameError).toBeDefined();
      expect(captainNameError?.message).toContain("at least 2 characters long");

      const serviceYearsError = result.error.find(
        (e) => e.path?.join(".") === "captain.serviceYears"
      );
      expect(serviceYearsError).toBeDefined();
      expect(serviceYearsError?.message).toContain(
        "Number must be at least 0."
      );
    }
  });

  it("should pass validation even when optional fields are missing", async () => {
    const validStarshipMissingOptional = {
      registryId: "FED-REG-NCC74656",
      shipName: "USS Voyager",
      class: "Intrepid Class",
      commissionDate: "48038.5",
      captain: {
        name: "Kathryn Janeway",
        species: "Human",
        homeWorld: "Earth",
        serviceYears: 20,
      },
      crew: [
        { name: "Chakotay", position: "First Officer", clearanceLevel: 9 },
      ],
      weaponSystems: [
        {
          type: "Phaser Array",
          powerOutputGigaWatts: 80,
          rangeKm: 250000,
          // isExperimental is missing
        },
      ],
      engine: {
        type: "Warp Drive",
        maxSpeed: "Warp 9.975",
      },
      defenses: {
        shields: {
          type: "Deflector Shields",
          capacity: 1500000,
        },
        hullPlating: {
          material: "Duranium",
          thicknessCm: 15,
        },
      },
      metadata: {
        lastMaintenanceStardate: "48122.1",
        starfleetOrder: "b2c3d4e5-f6a7-8901-2345-67890abcdef1",
        // notes is missing
      },
    };

    const result = await validate(StarshipSchema, validStarshipMissingOptional);
    expect(result.success).toBe(true);
  });
});
