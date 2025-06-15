// import { createClient } from "./dist";
// import { chain } from "lodash-es";
// import { uuidv7 as uuid } from "uuidv7";
export {};
// // --- Setup ---
// const zg = createClient();
// // (Assuming data from the first example is loaded)
// // --- Real-time Search Function ---
// function performSearch(query: string) {
//   const lowerCaseQuery = query.toLowerCase();
//   if (!lowerCaseQuery) {
//     return { users: [], posts: [], tags: [] };
//   }
//   // Search users by name using a lazy pipeline
//   const users = chain(zg.user)
//     .filter((user) => user.name.toLowerCase().includes(lowerCaseQuery))
//     .value();
//   // Search posts by title using a lazy pipeline
//   const posts = chain(zg.post)
//     .filter((post) => post.title.toLowerCase().includes(lowerCaseQuery))
//     .value();
//   // Search tags by name using a lazy pipeline
//   const tags = chain(zg.tag)
//     .filter((tag) => tag.name.toLowerCase().includes(lowerCaseQuery))
//     .value();
//   return { users, posts, tags };
// }
// // --- UI Simulation ---
// console.log("Simulating user typing into a search box...\n");
// let searchTerm = "a";
// console.log(`Searching for: "${searchTerm}"`);
// let results = performSearch(searchTerm);
// console.log(
//   "Found Users:",
//   results.users.map((u) => u.name)
// ); // Alice, Carol
// console.log(
//   "Found Posts:",
//   results.posts.map((p) => p.title)
// ); // Generics Explained
// console.log(
//   "Found Tags:",
//   results.tags.map((t) => t.name)
// ); // Performance
// console.log("---");
// searchTerm = "ali";
// console.log(`Searching for: "${searchTerm}"`);
// results = performSearch(searchTerm);
// console.log(
//   "Found Users:",
//   results.users.map((u) => u.name)
// ); // Alice
// console.log(
//   "Found Posts:",
//   results.posts.map((p) => p.title)
// ); // []
// console.log("---");
// searchTerm = "perf";
// console.log(`Searching for: "${searchTerm}"`);
// results = performSearch(searchTerm);
// console.log(
//   "Found Tags:",
//   results.tags.map((t) => t.name)
// ); // Performance
// console.log("---");
