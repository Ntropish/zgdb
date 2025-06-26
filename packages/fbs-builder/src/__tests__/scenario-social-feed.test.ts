import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

describe("Scenario Test: EchoSphere - Social Media Feed Item", () => {
  it("should generate a schema for a polymorphic social media feed", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: The "EchoSphere" social media platform needs to represent
     * items in a user's feed. A feed item is a container that holds metadata
     * (like post ID, author) and the content itself, which can be a simple
     * text message, a photo gallery, or an interactive poll.
     *
     * FEATURES TESTED:
     * - A complex `union` to handle different types of content.
     * - A `struct` for simple, related data (`PhotoMetadata`).
     * - Multiple tables, some of which are only used within the union.
     * - `deprecated` attribute on a field to test schema evolution.
     * - Vectors of strings for poll options and photo URLs.
     */

    builder.namespace("EchoSphere.Feed");

    // A simple text post.
    builder
      .table("TextContent")
      .docs("Content for a simple text-based post.")
      .field("text", "string");

    // A struct for photo metadata.
    builder
      .struct("PhotoMetadata")
      .docs("Metadata for a single photo.")
      .field("width", "ushort")
      .field("height", "ushort");

    // A gallery of photos.
    builder
      .table("GalleryContent")
      .docs("Content for a gallery post with multiple photos.")
      .field("urls", "string", { isVector: true })
      .field("metadata", "PhotoMetadata", { isVector: true });

    // An interactive poll.
    builder
      .table("PollContent")
      .docs("Content for an interactive poll.")
      .field("question", "string")
      .field("options", "string", { isVector: true });

    // The union that allows a FeedItem to contain any of the content types.
    builder
      .union("Content")
      .docs("A union of all possible content types for a feed item.")
      .value("TextContent")
      .value("GalleryContent")
      .value("PollContent");

    // The main container for any item appearing in the feed.
    builder
      .table("FeedItem")
      .docs("The root container for an item on the social media feed.")
      .field("id", "ulong", { attributes: { key: true } })
      .field("author_id", "string")
      .field("likes", "uint", { defaultValue: 0 })
      .field("old_thread_id", "string", { attributes: { deprecated: true } })
      .field("content", "Content", { attributes: { required: true } });

    builder.root_type("FeedItem");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();
  });
});
