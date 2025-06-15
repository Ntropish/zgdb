import { createClient } from "./dist/graph/index.js";
import { MapStoreAdapter } from "./map-store-adapter.js";
async function main() {
    // 1. Create an instance of the client with your chosen store.
    const db = createClient(new MapStoreAdapter());
    const janeDoe = await db.transact(async (tx) => tx.createNode("user", {
        fields: { name: "Jane Doe", age: 30 },
        relationIds: { posts: [], familiars: [] },
    }));
    const johnDoe = await db.transact(async (tx) => tx.createNode("user", {
        fields: { name: "John Doe", age: 25 },
        relationIds: { posts: [], familiars: [] },
    }));
    const tag1 = await db.transact(async (tx) => tx.createNode("tag", {
        fields: { name: "Salmon-walker" },
        relationIds: { posts: [] },
    }));
    // 3. Create a post and link it to Jane in a single transaction.
    await db.transact(async (tx) => {
        const post = await tx.createNode("post", {
            fields: {
                title: "Hello, World!",
                content: "Hello, World!",
                published: true,
                viewCount: 150,
            },
            relationIds: { author: janeDoe.id, tags: [] },
        });
        await tx.updateNode("user", janeDoe.id, (draft) => {
            draft.relationIds.posts.push(post.id);
        });
        return post;
    });
    await db.transact(async (tx) => {
        const post = await tx.createNode("post", {
            fields: {
                title: "Hola, Amigo!",
                content: "Hola, Amigo!",
                published: true,
                viewCount: 150,
            },
            relationIds: { author: johnDoe.id, tags: [tag1.id] },
        });
        await tx.updateNode("user", johnDoe.id, (draft) => {
            draft.relationIds.posts.push(post.id);
        });
        await tx.updateNode("tag", tag1.id, (draft) => {
            draft.relationIds.posts.push(post.id);
        });
        return post;
    });
    // 5. Read the final state of a node.
    const finalJohn = await db.transact(async (tx) => tx.getNode("user", johnDoe.id));
    console.log("Final User Data:", finalJohn);
    console.log(`User's post count: ${finalJohn?.relationIds.posts.length}`);
    const finalJane = await db.transact(async (tx) => tx.getNode("user", janeDoe.id));
    console.log("Final User Data:", finalJane);
}
main();
