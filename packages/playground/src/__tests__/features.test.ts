import { describe, it, expect, beforeEach } from "vitest";
import { ZgClient, createDB } from "@zgdb/client";
import { DB } from "../schema/__generated__/schema.js";

// This test suite is aspirational. It is written against the API described
// in MISSION.md and is designed to fail until all features are implemented.

let db: ZgClient<any>;

beforeEach(async () => {
  db = await createDB(DB);
});

describe("ZG Client: Relationships", () => {
  it("should create related nodes and allow synchronous traversal", async () => {
    const tx = await db.createTransaction({ actor: { id: "system-admin" } });

    // 1. Create the related nodes
    const user = tx.users.add({
      id: "user-A",
      publicKey: "key-A",
      displayName: "User A",
      avatarUrl: "http://example.com/a.png",
    });
    expect(user).toBeDefined();

    const authorId = user!.id;

    tx.posts.add({
      id: "post-1",
      title: "Post by A",
      content: "This is a post.",
      authorId: authorId,
      createdAt: BigInt(Date.now()),
    });

    // 2. Fetch the node from the "database"
    const foundPost = tx.posts.get("post-1");
    expect(foundPost).toBeDefined();

    // 3. Traverse the relationship SYNCHRONOUSLY
    const author = foundPost!.author;
    expect(author).toBeDefined();
    expect(author!.displayName).toBe("User A");

    // 4. Test the other side of the a relationship (many-to-one)
    const foundUser = tx.users.get("user-A");
    expect(foundUser).toBeDefined();

    const posts = foundUser!.posts;
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Post by A");

    await tx.commit();
  });

  it("should update a node via direct property assignment", async () => {
    const tx = await db.createTransaction({ actor: { id: "system" } });

    // 1. Create a post
    const originalPost = tx.posts.add({
      id: "post-to-update",
      title: "Original Title",
      content: "Some content.",
      authorId: "user-B",
      createdAt: BigInt(Date.now()),
    });
    expect(originalPost.title).toBe("Original Title");

    // 2. Update the title via direct assignment
    originalPost.title = "Updated Title";

    // 3. Verify the change is reflected on the same object
    expect(originalPost.title).toBe("Updated Title");

    // 4. Fetch the post again to ensure the change was persisted in the cache
    const updatedPost = tx.posts.get("post-to-update");
    expect(updatedPost).toBeDefined();
    expect(updatedPost!.title).toBe("Updated Title");

    // 5. Commit and fetch from a new instance to ensure it was written to the tree
    await tx.commit();

    const db2 = await createDB(DB);
    const tx2 = await db2.createTransaction({ actor: { id: "system" } });
    const finalPost = tx2.posts.get("post-to-update");
    expect(finalPost).toBeDefined();
    expect(finalPost!.title).toBe("Updated Title");
  });
});

// TODO: Re-implement resolvers and enable these tests
// describe("ZG Client: Resolvers", () => {
//   it("should resolve a computed field on an entity", () => {
//     const client = db.with({ id: "user-A" });
//     const post = client.posts.create({
//       id: "post-1",
//       title: "A very long post title",
//       content: "This is the content of the post which is quite long indeed.",
//       authorId: "user-A",
//       createdAt: BigInt(Date.now()),
//     });
//     // 'excerpt' should now be strongly typed
//     expect(post.excerpt).toBe(
//       "This is the content of the post which is quite lon"
//     );
//   });

//   it("should resolve a value from the global resolvers", () => {
//     const client = db.with({ id: "user-A" });
//     const post = client.posts.create({
//       id: "post-1",
//       title: "A post",
//       content: "content",
//       authorId: "user-A",
//       createdAt: BigInt(Date.now()),
//     });
//     // 'isOwner' should now be strongly typed
//     expect(post.isOwner).toBe(true);
//   });
// });
