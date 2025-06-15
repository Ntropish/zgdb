import { serializeNode, deserializeNode, createNodeData, updateNodeData, } from "./dist/graph/index.js";
import { KeyEncoder } from "@zgdb/runtime";
const DB = new Map();
let johnDoe;
let janeDoe;
let post1;
let post2;
let post3;
let post4;
let post5;
let tag1;
let familiar1;
// ---------------------------------------------- Create a new user
janeDoe = createNodeData.user({
    fields: { name: "Jane Doe", age: 30 },
    relationIds: { posts: [], familiars: [] },
});
DB.set(KeyEncoder.nodeKey("user", janeDoe.id).toString(), serializeNode.user(janeDoe));
// ---------------------------------------- Create another new user
johnDoe = createNodeData.user({
    fields: { name: "John Doe", age: 25 },
    relationIds: { posts: [], familiars: [] },
});
DB.set(KeyEncoder.nodeKey("user", johnDoe.id).toString(), serializeNode.user(johnDoe));
// ---------------- Create a new post and link it to the first user
post1 = createNodeData.post({
    fields: {
        title: "Hello, World!",
        content: "This is a test post.",
        published: true,
        viewCount: 150,
    },
    relationIds: { author: janeDoe.id, tags: [] },
});
DB.set(KeyEncoder.nodeKey("post", post1.id).toString(), serializeNode.post(post1));
// Update the latest user1 to establish the other side of the relation.
DB.set(KeyEncoder.nodeKey("user", janeDoe.id).toString(), serializeNode.user(updateNodeData.user(deserializeNode.user(DB.get(KeyEncoder.nodeKey("user", janeDoe.id).toString())), (draft) => {
    draft.relationIds.posts.push(post1.id);
})));
// --------------- Create a new post and link it to the second user
post2 = createNodeData.post({
    fields: {
        title: "Hello, Salmon-walker!",
        content: "Welcome to your exciting journey!",
        published: true,
        viewCount: 150,
    },
    relationIds: { author: johnDoe.id, tags: [] },
});
DB.set(KeyEncoder.nodeKey("post", post2.id).toString(), serializeNode.post(post2));
// Update the latest user2 to establish the other side of the relation.
DB.set(KeyEncoder.nodeKey("user", johnDoe.id).toString(), serializeNode.user(updateNodeData.user(deserializeNode.user(DB.get(KeyEncoder.nodeKey("user", johnDoe.id).toString())), (draft) => {
    draft.relationIds.posts.push(post2.id);
})));
// ---------------------------------------- Create a new tag
tag1 = createNodeData.tag({
    fields: { name: "Salmon-walker" },
    relationIds: { posts: [] },
});
DB.set(KeyEncoder.nodeKey("tag", tag1.id).toString(), serializeNode.tag(tag1));
// ---------------- Create a new post and link it to the tag
post3 = createNodeData.post({
    fields: {
        title: "Hola, Amigo!",
        content: "Estamos en la playa!",
        published: true,
        viewCount: 150,
    },
    relationIds: { author: johnDoe.id, tags: [tag1.id] },
});
DB.set(KeyEncoder.nodeKey("post", post3.id).toString(), serializeNode.post(post3));
DB.set(KeyEncoder.nodeKey("tag", tag1.id).toString(), serializeNode.tag(updateNodeData.tag(tag1, (draft) => {
    draft.relationIds.posts.push(post3.id);
})));
// ---------------------------------------- Create a new familiar
familiar1 = createNodeData.familiar({
    fields: { name: "John Doe", age: 25 },
    relationIds: { user: johnDoe.id },
});
DB.set(KeyEncoder.nodeKey("familiar", familiar1.id).toString(), serializeNode.familiar(familiar1));
DB.set(KeyEncoder.nodeKey("user", johnDoe.id).toString(), serializeNode.user(updateNodeData.user(deserializeNode.user(DB.get(KeyEncoder.nodeKey("user", johnDoe.id).toString())), (draft) => {
    draft.relationIds.familiars.push(familiar1.id);
})));
post4 = createNodeData.post({
    fields: {
        title: "Hola, Amigo!",
        content: "Me gusta la playa!",
        published: true,
        viewCount: 150,
    },
    relationIds: { author: janeDoe.id, tags: [tag1.id] },
});
DB.set(KeyEncoder.nodeKey("post", post4.id).toString(), serializeNode.post(post4));
DB.set(KeyEncoder.nodeKey("tag", tag1.id).toString(), serializeNode.tag(updateNodeData.tag(tag1, (draft) => {
    draft.relationIds.posts.push(post4.id);
})));
// ------------------- Add another post to John Doe
post5 = createNodeData.post({
    fields: {
        title: "Hola, Amigo!",
        content: "Me gusta la playa!",
        published: true,
        viewCount: 150,
    },
    relationIds: { author: johnDoe.id, tags: [tag1.id] },
});
DB.set(KeyEncoder.nodeKey("post", post5.id).toString(), serializeNode.post(post5));
DB.set(KeyEncoder.nodeKey("tag", tag1.id).toString(), serializeNode.tag(updateNodeData.tag(tag1, (draft) => {
    draft.relationIds.posts.push(post5.id);
})));
DB.set(KeyEncoder.nodeKey("user", johnDoe.id).toString(), serializeNode.user(updateNodeData.user(deserializeNode.user(DB.get(KeyEncoder.nodeKey("user", johnDoe.id).toString())), (draft) => {
    draft.relationIds.posts.push(post5.id);
})));
// ---------------------------------------- Serialize and deserialize to ensure everything works.
johnDoe = deserializeNode.user(DB.get(KeyEncoder.nodeKey("user", johnDoe.id).toString()));
janeDoe = deserializeNode.user(DB.get(KeyEncoder.nodeKey("user", janeDoe.id).toString()));
post1 = deserializeNode.post(DB.get(KeyEncoder.nodeKey("post", post1.id).toString()));
post2 = deserializeNode.post(DB.get(KeyEncoder.nodeKey("post", post2.id).toString()));
post3 = deserializeNode.post(DB.get(KeyEncoder.nodeKey("post", post3.id).toString()));
post4 = deserializeNode.post(DB.get(KeyEncoder.nodeKey("post", post4.id).toString()));
tag1 = deserializeNode.tag(DB.get(KeyEncoder.nodeKey("tag", tag1.id).toString()));
console.log("Final User Data:", johnDoe);
console.log(`User's post count: ${johnDoe.relationIds.posts.length}`);
console.log("Final User Data:", janeDoe);
console.log(`User's post count: ${janeDoe.relationIds.posts.length}`);
console.log("Final Post Data:", post1);
console.log(`Post's author: ${post1.relationIds.author}`);
