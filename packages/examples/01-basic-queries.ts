import { createClient } from "./dist/index.ts";
import type { User, Post, Tag } from "./dist/index.ts";
import { filter, countBy, sortBy, chain } from "lodash-es";
import { uuidv7 as uuid } from "uuidv7";

const zg = createClient();

// Seed some data
const alice = zg.user.add({ id: uuid(), name: "Alice", age: 30 });
const bob = zg.user.add({ id: uuid(), name: "Bob", age: 42 });
const carol = zg.user.add({ id: uuid(), name: "Carol", age: 30 });

const tsTag = zg.tag.add({ id: "typescript", name: "TypeScript" });
const perfTag = zg.tag.add({ id: "performance", name: "Performance" });

zg.post.add({
  id: uuid(),
  title: "Intro to zg",
  published: true,
  viewCount: 150,
  author: alice,
  tags: [tsTag, perfTag],
});
zg.post.add({
  id: uuid(),
  title: "Optimizing Loops",
  published: true,
  viewCount: 200,
  author: bob,
  tags: [perfTag],
});
zg.post.add({
  id: uuid(),
  title: "Generics Explained",
  published: false,
  viewCount: 0,
  author: alice,
  tags: [tsTag],
});

// --- Queries (Pipeline Pattern) ---

// By using `chain()` directly on the iterable `zg.post` and `zg.user` proxies,
// we create a lazy pipeline. Data is pulled from the PTree and processed
// incrementally, avoiding loading the entire collection into memory at once.

// 1. Find all published posts (like SELECT * FROM posts WHERE published = true)
const publishedPosts = chain(zg.post).filter({ published: true }).value(); // .value() executes the pipeline
console.log(
  "Published Posts:",
  publishedPosts.map((p) => p.title)
);

// 2. Count users by age (like SELECT age, COUNT(*) FROM users GROUP BY age)
const usersByAge = chain(zg.user).countBy("age").value();
console.log("Users by Age:", usersByAge); //-> { '30': 2, '42': 1 }

// 3. Find the most popular published post (like SELECT * FROM posts ORDER BY viewCount DESC LIMIT 1)
const mostPopularPost = chain(zg.post)
  .filter("published")
  .sortBy("viewCount")
  .last() // .last() is a terminating method that executes the chain
  .value();
console.log("Most Popular Post:", mostPopularPost?.title);

// 4. Find all posts by a specific author that are tagged 'TypeScript'
// This already uses a good pattern, as `alice.posts` is a specific, smaller array.
const alicesTsPosts = chain(alice.posts)
  .filter((post) => post.tags.some((tag) => tag.id === "typescript"))
  .value();

console.log(
  "Alice's TypeScript Posts:",
  alicesTsPosts.map((p) => p.title)
);
