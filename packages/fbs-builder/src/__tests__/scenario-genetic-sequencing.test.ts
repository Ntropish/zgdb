import { describe, it, expect } from "vitest";
import {
  createFbsBuilder,
  createInitialFbsFileState,
  renderFbs,
} from "../index.js";
import { runFlatc } from "./test-utils.js";

describe("Scenario Test: Project Chimera - Genetic Sequencing Data", () => {
  it("should generate a schema for storing genetic sequence batches", async () => {
    const builder = createFbsBuilder();
    const initialState = createInitialFbsFileState();

    /**
     * SCENARIO: A bioinformatics lab needs to store large batches of genetic
     * sequencing results. Efficiency is crucial for handling massive amounts
     * of data. The schema needs to be compact and allow for quick access
     * to specific data points.
     *
     * FEATURES TESTED:
     * - `include` for using types defined in other files (e.g., a standard Timestamp).
     * - `struct` for compact, fixed-layout data (`GeneMarker`).
     * - `vector` of bytes (`[ubyte]`) for raw sequence data.
     * - `vector` of structs (`[GeneMarker]`) for identified genes.
     * - Namespacing to organize the schema.
     */

    builder.namespace("Chimera.Genetics");
    builder.include("timestamp.fbs");

    // A struct to mark a specific gene's location and the confidence score.
    // Structs are used here for memory efficiency with large vectors.
    builder
      .struct("GeneMarker")
      .docs("Marks an identified gene at a specific position with a score.")
      .field("position", "uint")
      .field("confidence", "float");

    // A table to hold a single sequencing result, including the raw data
    // and a list of identified markers.
    builder
      .table("SequencingResult")
      .docs("Represents a single DNA sequence and its identified markers.")
      .field("id", "string", { attributes: { key: true } })
      .field("raw_sequence", "[ubyte]") // [ubyte] is a vector of bytes
      .field("markers", "GeneMarker", { isVector: true });

    // A batch can contain multiple results. This is our root type.
    builder
      .table("ResultBatch")
      .docs("A batch containing multiple sequencing results.")
      .field("batch_id", "string")
      .field("run_date", "Google.Protobuf.Timestamp")
      .field("results", "SequencingResult", { isVector: true });

    builder.root_type("ResultBatch");

    // Build and render the schema
    const finalState = await builder.build(initialState);
    const result = renderFbs(finalState);

    // The output will be compared against a snapshot.
    expect(result).toMatchSnapshot();

    // It should also be a valid FlatBuffers schema.
    const timestampFbs =
      "namespace Google.Protobuf;\n\ntable Timestamp { seconds: long; nanos: int; }";
    const includeFiles = new Map([["timestamp.fbs", timestampFbs]]);
    await runFlatc(result, "genetic_sequencing.fbs", includeFiles);
  });
});
