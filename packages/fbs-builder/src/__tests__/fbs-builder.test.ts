import { describe, it, expect } from "vitest";
import { createFbsBuilder, FbsTableBuilder } from "../index.js";

describe("fbs-builder", () => {
  it("should build a simple fbs file with chained calls", async () => {
    const builder = createFbsBuilder();

    // The initial product is an empty array of strings.
    const initialProduct: string[] = [];

    // Queue up build steps using the fluent, chained API.
    const userTable = builder.table("User") as any as FbsTableBuilder;
    userTable
      .docs("A user in the system")
      .field("id", "string")
      .field("name", "string")
      .auth("auth", [
        { type: "policy", value: "user_is_self" },
        { type: "capability", value: "admin" },
      ]);

    const postTable = builder.table("Post") as any as FbsTableBuilder;
    postTable
      .field("id", "string")
      .field("content", "string")
      .field("owner", "User");

    builder.root_type("User");

    const expected = `/// A user in the system
table User (auth: ["user_is_self", "admin"]) {
  id: string;
  name: string;
}

table Post {
  id: string;
  content: string;
  owner: User;
}

root_type User;`;

    // Execute the entire build pipeline.
    const fbsBlocks = await builder.build(initialProduct);
    const result = fbsBlocks.join("\n\n");

    expect(result.replace(/\\r\\n/g, "\n")).toBe(
      expected.replace(/\\r\\n/g, "\n")
    );
  });
});
