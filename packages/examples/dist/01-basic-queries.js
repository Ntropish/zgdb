import { serializeNode, deserializeNode, createNodeData, updateNodeData, } from "./dist/graph/index.js";
const User = new Map();
const Post = new Map();
const Tag = new Map();
const Familiar = new Map();
const PostTagEdge = new Map();
let johnDoe;
let janeDoe;
let post1;
let post2;
let post3;
let post4;
let tag1;
let familiar1;
// ---------------------------------------------- Create a new user
janeDoe = createNodeData.user({
    fields: { name: "Jane Doe", age: 30 },
    relationIds: { posts: [], familiars: [] },
});
User.set(janeDoe.id, serializeNode.user(janeDoe));
// ---------------------------------------- Create another new user
johnDoe = createNodeData.user({
    fields: { name: "John Doe", age: 25 },
    relationIds: { posts: [], familiars: [] },
});
User.set(johnDoe.id, serializeNode.user(johnDoe));
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
Post.set(post1.id, serializeNode.post(post1));
// Update the latest user1 to establish the other side of the relation.
User.set(janeDoe.id, serializeNode.user(updateNodeData.user(deserializeNode.user(User.get(janeDoe.id)), (draft) => {
    console.log("Updating user1 to establish the other side of the relation.", draft);
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
Post.set(post2.id, serializeNode.post(post2));
// Update the latest user2 to establish the other side of the relation.
User.set(johnDoe.id, serializeNode.user(updateNodeData.user(deserializeNode.user(User.get(johnDoe.id)), (draft) => {
    draft.relationIds.posts.push(post2.id);
})));
// ---------------------------------------- Create a new tag
tag1 = createNodeData.tag({
    fields: { name: "Salmon-walker" },
    relationIds: { posts: [] },
});
Tag.set(tag1.id, serializeNode.tag(tag1));
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
Post.set(post3.id, serializeNode.post(post3));
Tag.set(tag1.id, serializeNode.tag(updateNodeData.tag(tag1, (draft) => {
    draft.relationIds.posts.push(post3.id);
})));
// ---------------------------------------- Create a new familiar
familiar1 = createNodeData.familiar({
    fields: { name: "John Doe", age: 25 },
    relationIds: { user: johnDoe.id },
});
Familiar.set(familiar1.id, serializeNode.familiar(familiar1));
User.set(johnDoe.id, serializeNode.user(updateNodeData.user(deserializeNode.user(User.get(johnDoe.id)), (draft) => {
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
Post.set(post4.id, serializeNode.post(post4));
Tag.set(tag1.id, serializeNode.tag(updateNodeData.tag(tag1, (draft) => {
    draft.relationIds.posts.push(post4.id);
})));
// ---------------------------------------- Serialize and deserialize to ensure everything works.
johnDoe = deserializeNode.user(User.get(johnDoe.id));
janeDoe = deserializeNode.user(User.get(janeDoe.id));
post1 = deserializeNode.post(Post.get(post1.id));
post2 = deserializeNode.post(Post.get(post2.id));
post3 = deserializeNode.post(Post.get(post3.id));
post4 = deserializeNode.post(Post.get(post4.id));
tag1 = deserializeNode.tag(Tag.get(tag1.id));
console.log("Final User Data:", johnDoe);
console.log(`User's post count: ${johnDoe.relationIds.posts.length}`);
console.log("Final User Data:", janeDoe);
console.log(`User's post count: ${janeDoe.relationIds.posts.length}`);
console.log("Final Post Data:", post1);
console.log(`Post's author: ${post1.relationIds.author}`);
