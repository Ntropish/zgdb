import { describe, it, expect, beforeEach } from "vitest";
import { createDB } from "../schema/__generated__/createDB.js";

describe("ZG Playground Client", () => {
  let db: any;

  beforeEach(() => {
    db = createDB({
      globalResolvers: {},
      entityResolvers: {},
      auth: {},
    });
  });

  it("should be able to import the generated client", () => {
    expect(db).toBeDefined();
  });

  it("should create a new user and return a proxy object", () => {
    const client = db.with({ id: "test-user" });

    const newUser = client.users.create({
      id: "user-1",
      publicKey: "key-1",
      displayName: "Test User",
      avatarUrl: "http://example.com/avatar.png",
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBe("user-1");
    expect(newUser.displayName).toBe("Test User");
  });

  it("should find a created user by id", () => {
    const client = db.with({ id: "test-user" });

    client.users.create({
      id: "user-2",
      publicKey: "key-2",
      displayName: "Another User",
      avatarUrl: "http://example.com/avatar2.png",
    });

    const foundUser = client.users.get("user-2");
    expect(foundUser).toBeDefined();
    expect(foundUser.id).toBe("user-2");
    expect(foundUser.displayName).toBe("Another User");
  });
});
