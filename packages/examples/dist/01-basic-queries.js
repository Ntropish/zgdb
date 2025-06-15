// Note: The '.js' extension is required for ES Module imports in Node.js
import { serializeNode, deserializeNode, createNodeData, updateNodeData, } from "./dist/graph/index.js";
// 1. Create a user using the generated helper.
// This handles ID creation, timestamps, and Zod validation.
const user = createNodeData.user({
    fields: { name: "Jane Doe", age: 30 },
    relationIds: { posts: [], familiars: [] },
});
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
