import { describe, it, expect, beforeEach } from "vitest";
import { ZgClient, createDB } from "@zgdb/client";
import { DB } from "../schema/__generated__/schema";

describe("ZG Playground Client", () => {
  let db: ZgClient<any>;

  beforeEach(async () => {
    db = await createDB();
  });

  it("should be able to import the generated client", () => {
    expect(db).toBeDefined();
  });

  it("should create a new user and return a proxy object", async () => {
    const newUser = db.users.add({
      id: "user-1",
      publicKey: "key-1",
      displayName: "Test User",
      avatarUrl: "http://example.com/avatar.png",
    });

    expect(newUser).toBeDefined();
    expect(newUser.id).toBe("user-1");
    expect(newUser.displayName).toBe("Test User");

    await db.commit();

    const db2 = await createDB();
    const foundUser = db2.users.get("user-1");
    expect(foundUser).toBeDefined();
    expect(foundUser!.id).toBe("user-1");
    expect(foundUser!.displayName).toBe("Test User");
  });

  it("should find a created user by id", async () => {
    db.users.add({
      id: "user-2",
      publicKey: "key-2",
      displayName: "Another User",
      avatarUrl: "http://example.com/avatar2.png",
    });

    const foundUser = db.users.get("user-2");
    expect(foundUser).toBeDefined();
    expect(foundUser!.id).toBe("user-2");
    expect(foundUser!.displayName).toBe("Another User");

    await db.commit();
  });
});
