import { describe, it, expect } from "vitest";
import { createDB, IUser } from "../schema/__generated__/createDB.js";

describe("ZG Playground Client", () => {
  it("should be able to import the generated client", () => {
    expect(createDB).toBeDefined();
  });

  it("should create a new user and return a proxy object", () => {
    const client = createDB({
      globalResolvers: { isOwner: () => true },
      entityResolvers: {},
      auth: {},
    });
    client.setAuthContext({ actor: { id: "test-user" } });

    const newUser = client.users.create({
      id: "user-1",
      publicKey: "key-123",
      displayName: "Test User",
      avatarUrl: "http://example.com/avatar.png",
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBe("user-1");
    expect(newUser.displayName).toBe("Test User");
  });

  it("should find a created user by id", async () => {
    const client = createDB({
      globalResolvers: {
        isOwner: () => true,
        isPublic: () => true,
      },
      entityResolvers: {},
      auth: {},
    });
    client.setAuthContext({ actor: { id: "test-user" } });

    client.users.create({
      id: "user-to-find",
      publicKey: "key-456",
      displayName: "Findable User",
      avatarUrl: "http://example.com/avatar.png",
    });

    const foundUser = await client.users.get("user-to-find");

    expect(foundUser).toBeDefined();
    expect(foundUser!.id).toBe("user-to-find");
    expect(foundUser!.displayName).toBe("Findable User");
  });
});
