import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";

describe("Scenario Test: Project Chimera - Genetic Sequencing Data", () => {
  it("should generate a schema for storing genetic sequence batches", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: In "Project Chimera," researchers are analyzing genetic
     * sequences. They need a file format to store batches of sequencing
     * results. Each result contains metadata, a series of identified genes
     * with their confidence scores, and the raw electropherogram data from
     * the sequencing machine.
     *
     * FEATURES TESTED:
     * - `include` to import external type definitions (e.g., for timestamps).
     * - `vector` of `ubyte` for raw binary data.
     * - `vector` of `struct` for efficient storage of repetitive, structured data.
     * - Multiple tables to represent a structured dataset.
     * - `float` data type for confidence scores.
     */

    builder.namespace("Chimera.Genetics");
    builder.include("timestamp.fbs"); // Assuming a shared timestamp definition

    // Genes are identified as a position and a confidence score. A struct is
    // very efficient for this, especially when we have millions of them.
    builder
      .struct("GeneMarker")
      .docs("Marks an identified gene at a specific position with a score.")
      .field("position", "uint")
      .field("confidence", "float");

    // The main table for a single sequencing result.
    builder
      .table("SequencingResult")
      .docs("Contains the full results of a single DNA sequencing run.")
      .field("uuid", "string", { attributes: { key: true } })
      .field("timestamp", "Timestamp", {
        attributes: { required: true },
      }) // Assuming Timestamp is defined in `timestamp.fbs`
      .field("markers", "GeneMarker", { isVector: true })
      .field("electropherogram", "ubyte", { isVector: true }); // Raw data

    // A batch can contain multiple results. This is our root type.
    builder
      .table("ResultBatch")
      .docs("A batch containing multiple sequencing results.")
      .field("batch_id", "string")
      .field("results", "SequencingResult", { isVector: true });

    builder.root_type("ResultBatch");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();
  });
});
