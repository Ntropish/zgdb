import { describe, it, expect, beforeEach } from "vitest";
import { ZgClient, createDB } from "@zgdb/client";
import { DB } from "../schema/__generated__/schema.js";
import { BlockManager } from "@zgdb/prolly-tree";

describe("ZG Playground Client", () => {
  let db: ZgClient<any>;
  let blockManager: BlockManager;

  beforeEach(async () => {
    blockManager = new BlockManager();
    db = await createDB(DB, { blockManager });
  });

  it("should be able to import the generated client", () => {
    expect(db).toBeDefined();
  });

  it("should create a new user and return a proxy object", async () => {
    const tx = await db.createTransaction({ actor: { id: "system" } });

    const newUser = tx.users.add({
      id: "user-1",
      publicKey: "key-1",
      displayName: "Test User",
      avatarUrl: "http://example.com/avatar.png",
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBe("user-1");
    expect(newUser.displayName).toBe("Test User");

    await tx.commit();

    const root = db.getRoot();
    const db2 = await createDB(DB, { blockManager, root });
    const tx2 = await db2.createTransaction({ actor: { id: "system" } });

    const foundUser = tx2.users.get("user-1");
    expect(foundUser).toBeDefined();
    expect(foundUser!.id).toBe("user-1");
    expect(foundUser!.displayName).toBe("Test User");
  });

  it("should find a created user by id", async () => {
    const tx = await db.createTransaction({ actor: { id: "system" } });
    tx.users.add({
      id: "user-2",
      publicKey: "key-2",
      displayName: "Another User",
      avatarUrl: "http://example.com/avatar2.png",
    });

    const foundUser = tx.users.get("user-2");
    expect(foundUser).toBeDefined();
    expect(foundUser!.id).toBe("user-2");
    expect(foundUser!.displayName).toBe("Another User");

    await tx.commit();
  });
});
