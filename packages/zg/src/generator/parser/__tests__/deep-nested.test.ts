import { parseSchemas } from "..";
import { RawSchema } from "../types";
import { z } from "zod";

describe("Schema Parser Deep Edge Cases: Deeply Nested Objects", () => {
  it("should correctly parse a schema with multiple levels of nested objects and return all generated schemas", () => {
    const rawUserProfileSchema: RawSchema = {
      name: "UserProfile",
      description: "A user's profile with deeply nested settings.",
      schema: z.object({
        id: z.string(),
        email: z.string().email(),
        preferences: z.object({
          theme: z.enum(["dark", "light", "system"]).default("system"),
          notifications: z.object({
            email: z.object({
              marketing: z.boolean().default(false),
              newFollower: z.boolean().default(true),
              newComment: z.boolean().default(true),
            }),
            push: z.object({
              newFollower: z.boolean().default(true),
              newComment: z.boolean().default(true),
            }),
          }),
        }),
      }),
      relationships: {},
      indexes: [{ on: "email", unique: true }],
    };

    const normalized = parseSchemas([rawUserProfileSchema]);

    // Expect the top-level schema + 4 nested schemas
    expect(normalized).toHaveLength(5);

    const findSchema = (name: string) => {
      const schema = normalized.find((s) => s.name === name);
      if (!schema) {
        throw new Error(
          `Schema with name "${name}" not found in parser output.`
        );
      }
      return schema;
    };

    // 1. Validate UserProfile (Top-level)
    const userProfile = findSchema("UserProfile");
    expect(userProfile.fields).toEqual([
      { name: "id", type: "string", required: true },
      { name: "email", type: "string", required: true },
      {
        name: "preferences",
        type: "UserProfile_Preferences",
        required: true,
      },
    ]);
    expect(userProfile.indexes).toEqual([
      { on: ["email"], unique: true, type: "btree" },
    ]);

    // 2. Validate UserProfile_Preferences (Nested Level 1)
    const preferences = findSchema("UserProfile_Preferences");
    expect(preferences.fields).toEqual([
      { name: "theme", type: "string", required: true },
      {
        name: "notifications",
        type: "UserProfile_Preferences_Notifications",
        required: true,
      },
    ]);

    // 3. Validate UserProfile_Preferences_Notifications (Nested Level 2)
    const notifications = findSchema("UserProfile_Preferences_Notifications");
    expect(notifications.fields).toEqual([
      {
        name: "email",
        type: "UserProfile_Preferences_Notifications_Email",
        required: true,
      },
      {
        name: "push",
        type: "UserProfile_Preferences_Notifications_Push",
        required: true,
      },
    ]);

    // 4. Validate UserProfile_Preferences_Notifications_Email (Nested Level 3)
    const emailNotifications = findSchema(
      "UserProfile_Preferences_Notifications_Email"
    );
    expect(emailNotifications.fields).toEqual([
      { name: "marketing", type: "bool", required: true },
      { name: "newFollower", type: "bool", required: true },
      { name: "newComment", type: "bool", required: true },
    ]);

    // 5. Validate UserProfile_Preferences_Notifications_Push (Nested Level 3)
    const pushNotifications = findSchema(
      "UserProfile_Preferences_Notifications_Push"
    );
    expect(pushNotifications.fields).toEqual([
      { name: "newFollower", type: "bool", required: true },
      { name: "newComment", type: "bool", required: true },
    ]);
  });
});
