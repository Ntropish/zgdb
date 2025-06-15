// import { createClient } from "./dist";
// import type { User, Post, Tag } from "./dist";
// import { chain, flatMap, uniqBy, sumBy } from "lodash-es";
// import { uuidv7 as uuid } from "uuidv7";
export {};
// // --- Setup ---
// const zg = createClient();
// // (Assuming data from the previous example is already loaded)
// // This assumes the client can provide a way to get a node, which is reasonable.
// // We'll mock this for the example's purpose if it doesn't exist on the proxy.
// const alice = zg.user.get("user-id-for-alice");
// const bob = zg.user.get("user-id-for-bob");
// if (!alice || !bob) {
//   throw new Error("Alice or Bob not found");
// }
// // --- Analysis ---
// // 1. Find the most influential tag
// // A tag's influence is the sum of the view counts of all posts using it.
// const tagInfluence = chain(zg.tag) // Use the iterable directly
//   .map((tag) => ({
//     name: tag.name,
//     influence: sumBy(tag.posts, (p) => p.viewCount),
//   }))
//   .sortBy("influence")
//   .last()
//   .value();
// console.log("Most Influential Tag:", tagInfluence); //-> { name: 'Performance', influence: 350 }
// // 2. Social Network Analysis: Find "friends of friends"
// // This part of the logic is okay, as it operates on `alice.posts`, which is
// // a specific, finite array relation, not the entire database collection.
// const alicesTags = flatMap(alice.posts, (p) => p.tags);
// const friendPosts = flatMap(alicesTags, (t) => t.posts);
// const friendsOfAlice = uniqBy(
//   flatMap(friendPosts, (p) => p.author),
//   (f) => f.id
// );
// console.log(
//   "Alice's 'friends':",
//   friendsOfAlice.map((f) => f.name)
// ); //-> [ 'Alice', 'Bob' ]
// // 3. Content Recommendation: Suggest tags for a user
// // Suggest tags that appear in posts by other authors that the user hasn't used yet.
// const alicesUsedTagIds = new Set(
//   flatMap(alice.posts, (p) => p.tags).map((t) => t.id)
// );
// const suggestedTags = chain(zg.post) // Use the iterable directly
//   .filter((p) => p.author.id !== alice.id) // Find posts by other authors
//   .flatMap("tags") // Get all their tags
//   .uniqBy("id") // Remove duplicate tags
//   .reject((tag) => alicesUsedTagIds.has(tag.id)) // Filter out tags Alice already used
//   .value();
// console.log(
//   "Suggested tags for Alice:",
//   suggestedTags.map((t) => t.name)
// );
// // (This would be empty with our current data, but shows the pattern)
