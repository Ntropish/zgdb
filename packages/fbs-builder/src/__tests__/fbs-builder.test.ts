import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  FbsFileState,
  renderFbsFile,
  FbsTableBuilder,
} from "../index.js";

describe("fbs-builder", () => {
  it("should build a simple fbs file with chained calls", async () => {
    const builder = createFbsBuilder();

    // The initial state that the final build() will mutate.
    const initialState: FbsFileState = {
      tables: new Map(),
      rootType: null,
    };

    // Queue up build steps using the fluent, chained API.
    const userTableBuilder = builder.table("User") as any as FbsTableBuilder;
    userTableBuilder
      .docs("A user in the system")
      .field("id", "string")
      .field("name", "string")
      .auth("auth", [
        { type: "policy", value: "user_is_self" },
        { type: "capability", value: "admin" },
      ]);

    const postTableBuilder = builder.table("Post") as any as FbsTableBuilder;
    postTableBuilder
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
    const finalState = await builder.build(initialState);
    const result = renderFbsFile(finalState);

    expect(result.replace(/\\r\\n/g, "\\n")).toBe(
      expected.replace(/\\r\\n/g, "\\n")
    );
  });
});
