import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  FbsTableBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

describe("fbs-builder", () => {
  it("should build a simple fbs file with chained calls", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    // Queue up build steps using the fluent, chained API.
    const userTable = builder.table("User");
    userTable
      .docs("A user in the system")
      .field("id", "string", { attributes: { key: true } })
      .field("name", "string")
      .auth("auth", [
        { type: "policy", value: "user_is_self" },
        { type: "capability", value: "admin" },
      ]);

    const postTable: FbsTableBuilder = builder.table("Post");
    postTable
      .field("id", "string")
      .field("content", "string")
      .field("owner", "User");

    builder.root_type("User");

    const expected = `/// A user in the system
table User (auth: { policy: ["user_is_self"], capability: ["admin"] }) {
  id: string (key);
  name: string;
}

table Post {
  id: string;
  content: string;
  owner: User;
}

root_type User;`;

    // Execute the entire build pipeline.
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // Using .trim() to remove leading/trailing whitespace and comparing
    // line by line after splitting to avoid OS-specific newline issues.
    expect(
      result
        .trim()
        .split(/\\r?\\n/)
        .join("\\n")
    ).toBe(
      expected
        .trim()
        .split(/\\r?\\n/)
        .join("\\n")
    );
  });
});
