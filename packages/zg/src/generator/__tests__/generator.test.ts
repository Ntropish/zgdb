import { z } from "zod";
import { toMatchSpecificSnapshot } from "jest-specific-snapshot";
import { parseSchemas } from "../parser";
import { RawSchema } from "../parser/types";
import { generateFbs } from "../generator";

// The type definitions for 'jest-specific-snapshot' are not fully compatible
// with modern versions of Jest's types, so we use a type assertion to resolve it.
expect.extend({ toMatchSpecificSnapshot: toMatchSpecificSnapshot as any });

describe("FBS Generator", () => {
  it("should generate a correct FBS schema string from a complex normalized schema", () => {
    // 1. Define a complex raw schema with nested objects.
    const rawUserProfileSchema: RawSchema = {
      name: "UserProfile",
      description: "A user's profile with deeply nested settings.",
      schema: z.object({
        id: z.string(),
        preferences: z.object({
          theme: z.enum(["dark", "light"]).default("dark"),
          notifications: z.object({
            email: z.boolean().default(true),
            push: z.boolean().optional(),
          }),
        }),
      }),
    };

    // 2. Parse it into our IR.
    const normalizedSchemas = parseSchemas([rawUserProfileSchema]);

    // 3. Generate the FBS string from the IR.
    const fbsContent = generateFbs(normalizedSchemas);

    // 4. Compare the output to a stored snapshot in a specific file.
    const snapshotPath = "./__snapshots__/UserProfile.fbs.snap";
    expect(fbsContent).toMatchSpecificSnapshot(snapshotPath);
  });
});
