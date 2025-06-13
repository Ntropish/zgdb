import { createClient } from "./client";
import type { ClientConfig } from "./client";
import { uuidv7 as uuid } from "uuidv7";

// Mock the prolly-gunna PTree library
jest.mock("prolly-gunna", () => {
  const store = new Map<string, Uint8Array>();
  return {
    PTree: jest.fn().mockImplementation(() => ({
      insertSync: (key: Uint8Array, value: Uint8Array) => {
        store.set(Buffer.from(key).toString(), value);
      },
      getSync: (key: Uint8Array) => {
        return store.get(Buffer.from(key).toString());
      },
      // Mock the NEW synchronous scan method for iterators.
      scanItemsSync: jest.fn(({ startBound }) => {
        const prefix = Buffer.from(startBound!).toString();
        const items = [];
        for (const [key, value] of store.entries()) {
          if (key.startsWith(prefix)) {
            items.push([Buffer.from(key), value]);
          }
        }
        return { items, hasNextPage: false };
      }),
    })),
  };
});

// A more complex mock client configuration for testing relationships
const mockConfig: ClientConfig = {
  nodes: {
    user: {
      serialize: (builder, data) => {
        const nameOffset = builder.createString(data.name || "");
        builder.startObject(1);
        builder.addFieldOffset(0, nameOffset, 0);
        return builder.endObject();
      },
      deserialize: (buffer) => ({
        name: () => "Mock User Name",
      }),
      relations: {
        posts: { kind: "one-to-many", target: "post", foreignKey: "author_id" },
      },
    },
    post: {
      serialize: (builder, data) => {
        const titleOffset = builder.createString(data.title || "");
        const authorIdOffset = builder.createString(data.author?.id || "");
        builder.startObject(2);
        builder.addFieldOffset(0, titleOffset, 0);
        builder.addFieldOffset(1, authorIdOffset, 0); // author_id
        return builder.endObject();
      },
      deserialize: (buffer) => {
        const decoder = new TextDecoder();
        const jsonStr = decoder.decode(buffer).replace(/[\u0000-\u001F]/g, "");
        const id = jsonStr.match(/"id":"([^"]+)"/)?.[1] || "mock-author-id";
        return {
          title: () => "Mock Post Title",
          author_id: () => id, // Return the actual ID for traversal
        };
      },
      relations: {
        author: { kind: "one-to-one", target: "user", localKey: "author_id" },
      },
    },
  },
};

describe("zg Runtime Proxies", () => {
  let zg: any;

  beforeEach(() => {
    zg = createClient(mockConfig);
  });

  describe("NodeSetProxy (e.g., zg.user)", () => {
    it("should add a new node to the PTree", () => {
      const userId = uuid();
      const newUser = zg.user.add({ id: userId, name: "Alice" });
      expect(newUser.id).toBe(userId);
      const retrievedUser = zg.user.get(userId);
      expect(retrievedUser).not.toBeNull();
      expect(retrievedUser.id).toBe(userId);
    });

    it("should return a proxy object on get", () => {
      const userId = uuid();
      zg.user.add({ id: userId, name: "Bob" });
      const user = zg.user.get(userId);
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it("should return null if node does not exist", () => {
      const user = zg.user.get(uuid());
      expect(user).toBeNull();
    });

    it("should return the same proxy object for the same ID (caching)", () => {
      const userId = uuid();
      zg.user.add({ id: userId, name: "Carol" });
      const user1 = zg.user.get(userId);
      const user2 = zg.user.get(userId);
      expect(user1).toBe(user2);
    });
  });

  describe("NodeProxy (e.g., a specific user object)", () => {
    it("should retrieve a primitive property from the store", () => {
      const userId = uuid();
      zg.user.add({ id: userId, name: "David" });
      const user = zg.user.get(userId);
      expect(user.name).toBe("Mock User Name");
    });
  });

  describe("Relationship Traversal", () => {
    test("should resolve a one-to-one relationship (post.author)", () => {
      const authorId = uuid();
      const author = zg.user.add({ id: authorId, name: "Alice" });

      jest.spyOn(mockConfig.nodes.post, "deserialize").mockReturnValueOnce({
        title: () => "My Post",
        author_id: () => authorId,
      });

      const post = zg.post.add({ id: uuid(), title: "My Post", author });

      const retrievedPost = zg.post.get(post.id);

      expect(retrievedPost.author).not.toBeNull();
      expect(retrievedPost.author.id).toBe(author.id);
      expect(retrievedPost.author).toBe(author);
    });

    test("should resolve a one-to-many relationship (user.posts)", () => {
      const authorId = uuid();
      const author = zg.user.add({ id: authorId, name: "Bob" });

      jest
        .spyOn(mockConfig.nodes.post, "deserialize")
        .mockReturnValueOnce({
          title: () => "Post 1",
          author_id: () => authorId,
        })
        .mockReturnValueOnce({
          title: () => "Post 2",
          author_id: () => authorId,
        });

      const post1 = zg.post.add({ id: uuid(), title: "Post 1", author });
      const post2 = zg.post.add({ id: uuid(), title: "Post 2", author });

      const retrievedAuthor = zg.user.get(author.id);

      expect(retrievedAuthor.posts).toBeInstanceOf(Array);
      expect(retrievedAuthor.posts.length).toBe(2);
      expect(retrievedAuthor.posts.map((p: any) => p.id)).toContain(post1.id);
    });
  });

  describe("Collection Iteration", () => {
    test("should be iterable with a for...of loop", () => {
      const id1 = uuid();
      const id2 = uuid();
      zg.user.add({ id: id1, name: "User 1" });
      zg.user.add({ id: id2, name: "User 2" });

      const foundIds = [];
      for (const user of zg.user) {
        foundIds.push(user.id);
      }

      expect(foundIds.length).toBe(2);
      expect(foundIds).toContain(id1);
      expect(foundIds).toContain(id2);
    });
  });
});
