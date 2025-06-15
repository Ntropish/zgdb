import { serializeNode, deserializeNode } from "./dist/graph/index.js";
import { uuidv7 as uuid } from "uuidv7";
const createNodeData = {
    user: ({ fields, relationIds, }) => ({
        id: uuid(),
        type: "user",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields,
        relationIds,
    }),
    post: ({ fields, relationIds, }) => ({
        id: uuid(),
        type: "post",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        fields,
        relationIds,
    }),
};
const user = createNodeData.user({
    fields: {
        name: "John Doe",
        age: 20,
    },
    relationIds: {
        posts: [],
        familiars: [],
    },
});
const post = createNodeData.post({
    fields: {
        title: "Hello World",
        content: "This is a test post",
        published: true,
        viewCount: 100,
    },
    relationIds: {
        author: user.id,
        tags: [],
    },
});
user.relationIds.posts.push(post.id);
const serializedUser = serializeNode.user(user);
const serializedPost = serializeNode.post(post);
console.log("serializedUser", serializedUser);
console.log("serializedPost", serializedPost);
const remadeUser = deserializeNode.user(serializedUser);
const remadePost = deserializeNode.post(serializedPost);
console.log("remadeUser", remadeUser);
console.log("remadePost", remadePost);
