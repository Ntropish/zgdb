import { describe, it, expect, beforeEach } from "vitest";
import {
  createDB,
  IUser,
  IPost,
  UserNode,
  PostNode,
} from "../schema/__generated__/createDB.js";
import { ZgAuthContext } from "@zgdb/client";

// This test suite is aspirational. It is written against the API described
// in MISSION.md and is designed to fail until all features are implemented.

type Actor = { id: string };
let client: ReturnType<typeof createDB<Actor>>;

beforeEach(() => {
  client = createDB({
    // Features to be implemented
    globalResolvers: {},
    entityResolvers: {},
    auth: {},
  });
  client.setAuthContext({ actor: { id: "system-admin" } });
});

describe("ZG Client: Relationships", () => {
  it("should create related nodes and allow synchronous traversal", async () => {
    // 1. Create the related nodes
    const user = client.users.create({
      id: "user-A",
      publicKey: "key-A",
      displayName: "User A",
      avatarUrl: "http://example.com/a.png",
    });

    const authorId = user.id!;

    client.posts.create({
      id: "post-1",
      title: "Post by A",
      content: "This is a post.",
      authorId: authorId,
      createdAt: BigInt(Date.now()),
    });

    // 2. Fetch the node from the "database"
    const foundPost = await client.posts.get("post-1");
    expect(foundPost).toBeDefined();

    // 3. Traverse the relationship SYNCHRONOUSLY
    // This will fail until relationship logic is implemented in the generator.
    // We cast to `any` because the `author` property won't exist on the type yet.
    const author = (foundPost! as any).author;
    expect(author).toBeDefined();
    expect(author.displayName).toBe("User A");

    // 4. Test the other side of the relationship (many-to-one)
    const foundUser = await client.users.get("user-A");
    expect(foundUser).toBeDefined();

    // We cast to `any` because the `posts` property won't exist on the type yet.
    const posts = (foundUser! as any).posts;
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Post by A");
  });
});

describe("ZG Client: Core Features (TDD)", () => {
  describe("Relationships", () => {
    it("should create related nodes and allow synchronous traversal", async () => {
      // 1. Create the related nodes
      const user = client.users.create({
        id: "user-A",
        publicKey: "key-A",
        displayName: "User A",
        avatarUrl: "http://example.com/a.png",
      });

      const post = client.posts.create({
        id: "post-1",
        title: "Post by A",
        content: "This is a post.",
        authorId: user.id!, // Assign the ID as per the schema
        createdAt: BigInt(Date.now()),
      });

      // 2. Fetch the node from the "database"
      const foundPost = await client.posts.get("post-1");
      expect(foundPost).toBeDefined();

      // 3. Traverse the relationship SYNCHRONOUSLY
      // This is the key developer experience we are testing.
      // It will fail until relationship logic is implemented.
      const author = (foundPost! as any).author;
      expect(author).toBeDefined();
      expect(author!.displayName).toBe("User A");

      // 4. Test the other side of the relationship
      const foundUser = await client.users.get("user-A");
      expect(foundUser).toBeDefined();
      const posts = (foundUser! as any).posts;
      expect(posts).toHaveLength(1);
      expect(posts[0].title).toBe("Post by A");
    });
  });

  describe("Resolvers", () => {
    it("should resolve a computed field on an entity", () => {
      const post = client.posts.create({
        id: "post-1",
        title: "A very long post title",
        content: "This is the content of the post which is quite long indeed.",
        authorId: "user-A",
        createdAt: BigInt(Date.now()),
      });
      // 'excerpt' is not in the schema, it's a resolver
      expect(post.excerpt).toBe(
        "This is the content of the post which is quite lo"
      );
    });

    it("should resolve a value from the global resolvers", () => {
      const post = client.posts.create({
        id: "post-1",
        title: "A post",
        content: "content",
        authorId: "user-A",
        createdAt: BigInt(Date.now()),
      });
      // This tests that the auth context is passed to resolvers
      expect(post.isOwner).toBe(true);
    });
  });

  describe("Authorization", () => {
    it("should throw an error when trying to create a resource for another user", () => {
      // Authenticated as User A
      expect(() => {
        client.posts.create({
          id: "post-1",
          title: "Post by B",
          content: "This should fail.",
          authorId: "user-B", // Trying to create a post for User B
          createdAt: BigInt(Date.now()),
        });
      }).toThrow("Authorization failed for create on Post");
    });

    it("should throw an error when trying to update a resource owned by another user", () => {
      const post = client.posts.create({
        id: "post-1",
        title: "Original Title",
        content: "Original content.",
        authorId: "user-A",
        createdAt: BigInt(Date.now()),
      });

      // Switch to User B
      client.setAuthContext({ actor: { id: "user-B" } });

      expect(() => {
        client.posts.update(post.id!, { title: "New Title" });
      }).toThrow("Authorization failed for update on Post");
    });

    it("should return null when trying to read a resource with failing auth rules", async () => {
      // Modify auth rules for this specific test
      client = createDB({
        globalResolvers: {
          isOwner: (
            ctx: ZgAuthContext<Actor>,
            { node }: { node: PostNode<Actor> }
          ) => ctx.actor?.id === node.authorId,
        },
        entityResolvers: {},
        auth: {
          Post: { read: "isOwner" }, // Only owners can read
        },
      });
      client.setAuthContext({ actor: { id: "user-A" } });
      const post = client.posts.create({
        id: "private-post",
        title: "A private post",
        content: "Only User A should see this.",
        authorId: "user-A",
        createdAt: BigInt(Date.now()),
      });

      // Switch to User B
      client.setAuthContext({ actor: { id: "user-B" } });

      const foundPost = await client.posts.get(post.id!);
      expect(foundPost).toBeNull();
    });
  });
});
