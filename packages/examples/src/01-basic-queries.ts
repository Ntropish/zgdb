import { schema, serializeNode, deserializeNode } from "./dist/graph/index.js";
import type { UserData, PostData } from "./dist/graph/index.d.ts";
import { ProllyStorage } from "@zgdb/runtime";
import { PTree } from "prolly-gunna";
import { uuidv7 as uuid } from "uuidv7";

const createNodeData = {
  user: ({
    fields,
    relationIds,
  }: {
    fields: UserData["fields"];
    relationIds: UserData["relationIds"];
  }): UserData => ({
    id: uuid(),
    type: "user" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields,
    relationIds,
  }),
  post: ({
    fields,
    relationIds,
  }: {
    fields: PostData["fields"];
    relationIds: PostData["relationIds"];
  }): PostData => ({
    id: uuid(),
    type: "post" as const,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    fields,
    relationIds,
  }),
};

const user: UserData = createNodeData.user({
  fields: {
    name: "John Doe",
    age: 20,
  },
  relationIds: {
    posts: [],
    familiars: [],
  },
});

const post: PostData = createNodeData.post({
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
