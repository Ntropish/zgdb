import { createClient } from "./dist/graph/index.js";
import { MapStoreAdapter } from "./map-store-adapter.js";

async function main() {
  // 1. Create an instance of the client with your chosen store.
  const db = createClient(new MapStoreAdapter());

  // 2. Create nodes using the high-level API.
  const janeDoe = await db.createNode("user", {
    fields: { name: "Jane Doe", age: 30 },
    relationIds: { posts: [], familiars: [] },
  });

  const johnDoe = await db.createNode("user", {
    fields: { name: "John Doe", age: 25 },
    relationIds: { posts: [], familiars: [] },
  });

  const tag1 = await db.createNode("tag", {
    fields: { name: "Salmon-walker" },
    relationIds: { posts: [] },
  });

  // 3. Create a post and link it to Jane in a single transaction.
  const post1 = await db.createNode("post", {
    fields: {
      title: "Hello, World!",
      content: "Hello, World!",
      published: true,
      viewCount: 150,
    },
    relationIds: { author: janeDoe.id, tags: [] },
  });

  await db.updateNode("user", janeDoe.id, (draft) => {
    draft.relationIds.posts.push(post1.id);
  });

  // 4. Link a new post to John and a tag simultaneously.
  const post3 = await db.createNode("post", {
    fields: {
      title: "Hola, Amigo!",
      content: "Hola, Amigo!",
      published: true,
      viewCount: 150,
    },
    relationIds: { author: johnDoe.id, tags: [tag1.id] },
  });

  await db.updateNode("user", johnDoe.id, (draft) => {
    draft.relationIds.posts.push(post3.id);
  });

  await db.updateNode("tag", tag1.id, (draft) => {
    draft.relationIds.posts.push(post3.id);
  });

  // 5. Read the final state of a node.
  const finalJohn = await db.getNode("user", johnDoe.id);

  console.log("Final User Data:", finalJohn);
  console.log(`User's post count: ${finalJohn?.relationIds.posts.length}`);
}

main();
