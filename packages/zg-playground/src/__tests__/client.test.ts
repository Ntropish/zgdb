import { describe, it, expect } from "vitest";
import { createZgClient, IUser } from "../../zg/schema.zg.js";

describe("ZG Playground Client", () => {
  it("should be able to import the generated client", () => {
    expect(createZgClient).toBeDefined();
  });

  it("should create a new user and return a proxy object", async () => {
    const client = createZgClient({
      db: {
        get: async () => undefined,
        put: async () => {},
      },
      resolvers: { global: { isOwner: () => true }, local: {} },
    });
    client.setAuthContext({ id: "test-user" });

    const newUser = await client.users.create({
      id: "user-1",
      publicKey: "key-123",
      displayName: "Test User",
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBe("user-1");
    expect(newUser.displayName).toBe("Test User");
  });

  it("should find a created user by id", async () => {
    // Use a map to simulate a persistent block store.
    const store = new Map<string, Uint8Array>();
    const client = createZgClient({
      db: {
        get: async (cid: any) => store.get(cid.toString()),
        put: async (cid: any, block: any) => {
          store.set(cid.toString(), block);
        },
      },
      resolvers: {
        global: {
          isOwner: () => true,
          isPublic: () => true,
        },
        local: {},
      },
    });
    client.setAuthContext({ id: "test-user" });

    await client.users.create({
      id: "user-to-find",
      publicKey: "key-456",
      displayName: "Findable User",
    });

    const foundUser = await client.users.get("user-to-find");

    expect(foundUser).toBeDefined();
    expect(foundUser!.id).toBe("user-to-find");
    expect(foundUser!.displayName).toBe("Findable User");
  });
});
