import {
  serializeNode,
  deserializeNode,
  createNodeData,
  updateNodeData,
  UserData,
  PostData,
  FamiliarData,
  TagData,
} from "./dist/graph/index.js";

const users = new Map<string, UserData>();
const posts = new Map<string, PostData>();
const tags = new Map<string, TagData>();
const familiars = new Map<string, FamiliarData>();

// 1. Create a user using the generated helper.
// This handles ID creation, timestamps, and Zod validation.
const user1 = createNodeData.user({
  fields: { name: "Jane Doe", age: 30 },
  relationIds: { posts: [], familiars: [] },
});
users.set(user1.id, user1);

const user2 = createNodeData.user({
  fields: { name: "John Doe", age: 25 },
  relationIds: { posts: [], familiars: [] },
});
users.set(user2.id, user2);

const post1 = createNodeData.post({
  fields: {
    title: "Hello, World!",
    content: "This is a test post.",
    published: true,
    viewCount: 150,
  },
  relationIds: { author: user1.id, tags: [] },
});
posts.set(post1.id, post1);

const post2 = createNodeData.post({
  fields: {
    title: "Hello, Salmon-walker!",
    content: "Welcome to your exciting journey!",
    published: true,
    viewCount: 150,
  },
  relationIds: { author: user2.id, tags: [] },
});
posts.set(post2.id, post2);

const tag1 = createNodeData.tag({
  fields: { name: "Salmon-walker" },
  relationIds: { posts: [] },
});
tags.set(tag1.id, tag1);

// 2. Create a post and link it to the user.
const post = createNodeData.post({
  fields: {
    title: "Hello, World!",
    content: "This is a test post.",
    published: true,
    viewCount: 150,
  },
  relationIds: { author: user.id, tags: [] },
});

// 3. Update the user to establish the other side of the relation.
const updatedUser = updateNodeData.user(user, {
  relationIds: { posts: [post.id] },
});

// 4. Serialize and deserialize to ensure everything works.
const serializedUser = serializeNode.user(updatedUser);
const remadeUser = deserializeNode.user(serializedUser);

console.log("Final User Data:", remadeUser);
console.log(`User's post count: ${remadeUser.relationIds.posts.length}`);
