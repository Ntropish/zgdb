import { describe, it, expect, beforeEach } from "vitest";
import { createDB } from "../schema/__generated__/createDB.js";
import { ZgBaseNode } from "@zgdb/client";

// This test suite is aspirational. It is written against the API described
// in MISSION.md and is designed to fail until all features are implemented.

type Actor = { id: string };

let db: any;

beforeEach(() => {
  db = createDB({
    globalResolvers: {
      isOwner: (ctx: { actor: Actor; node: any }) => {
        return ctx.actor?.id === ctx.node.authorId;
      },
    },
    entityResolvers: {
      Post: {
        excerpt: (ctx: { node: { content: string } }) => {
          return ctx.node.content.substring(0, 50);
        },
      },
    },
    auth: {},
  });
});

describe("ZG Client: Relationships", () => {
  it("should create related nodes and allow synchronous traversal", () => {
    const systemClient = db.createClient({ id: "system-admin" });

    // 1. Create the related nodes
    systemClient.users.create({
      id: "user-A",
      publicKey: "key-A",
      displayName: "User A",
      avatarUrl: "http://example.com/a.png",
    });

    const user = systemClient.users.get("user-A");
    expect(user).toBeDefined();

    const authorId = user!.id;

    systemClient.posts.create({
      id: "post-1",
      title: "Post by A",
      content: "This is a post.",
      authorId: authorId,
      createdAt: BigInt(Date.now()),
    });

    // 2. Fetch the node from the "database" using a client
    const clientForUserA = db.createClient({ id: "user-A" });
    const foundPost = clientForUserA.posts.get("post-1");
    expect(foundPost).toBeDefined();

    // 3. Traverse the relationship SYNCHRONOUSLY
    const author = foundPost!.author;
    expect(author).toBeDefined();
    expect(author!.displayName).toBe("User A");

    // 4. Test the other side of the relationship (many-to-one)
    const foundUser = clientForUserA.users.get("user-A");
    expect(foundUser).toBeDefined();

    // TODO: Implement 'many' relationship traversal
    // const posts = foundUser!.posts;
    // expect(posts).toHaveLength(1);
    // expect(posts[0].title).toBe("Post by A");
  });

  it("should update a node via direct property assignment", () => {
    const client = db.createClient({ id: "system" });

    // 1. Create a post
    const originalPost = client.posts.create({
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

    // 4. Fetch the post again to ensure the change was persisted
    const updatedPost = client.posts.get("post-to-update");
    expect(updatedPost).toBeDefined();
    expect(updatedPost!.title).toBe("Updated Title");
  });
});

describe("ZG Client: Resolvers", () => {
  it("should resolve a computed field on an entity", () => {
    const client = db.createClient({ id: "user-A" });
    const post = client.posts.create({
      id: "post-1",
      title: "A very long post title",
      content: "This is the content of the post which is quite long indeed.",
      authorId: "user-A",
      createdAt: BigInt(Date.now()),
    });
    // 'excerpt' should now be strongly typed
    expect(post.excerpt).toBe(
      "This is the content of the post which is quite lon"
    );
  });

  it("should resolve a value from the global resolvers", () => {
    const client = db.createClient({ id: "user-A" });
    const post = client.posts.create({
      id: "post-1",
      title: "A post",
      content: "content",
      authorId: "user-A",
      createdAt: BigInt(Date.now()),
    });
    // 'isOwner' should now be strongly typed
    expect(post.isOwner).toBe(true);
  });
});
