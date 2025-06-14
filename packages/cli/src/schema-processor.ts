// --- src/schema-processor.ts ---
import { z } from "zod";

// Define a more specific type for the schema for internal use.
const EdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  cardinality: z.enum(["one-to-one", "one-to-many"]),
  name: z.object({
    forward: z.string(),
    backward: z.string(),
  }),
});
type Edge = z.infer<typeof EdgeSchema>;

export interface ProcessedEdge extends Edge {
  canonicalName: {
    forward: string;
    backward: string;
  };
}

export interface ProcessedSchema {
  nodes: any; // For now, keep nodes as any
  edges: ProcessedEdge[];
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Processes the raw schema from the user config, adding canonical names
 * and other useful metadata for the codegen pipeline.
 * @param schema The raw schema object.
 * @returns A processed schema ready for code generation.
 */
export function processSchema(schema: any): ProcessedSchema {
  const processedEdges = schema.edges.map((edge: Edge) => {
    // Validate each edge against our internal schema
    const parsedEdge = EdgeSchema.parse(edge);

    const sourceName = capitalize(parsedEdge.source);
    const targetName = capitalize(parsedEdge.target);

    const forward = `${sourceName}_${parsedEdge.name.forward}_${targetName}`;
    const backward = `${targetName}_${parsedEdge.name.backward}_${sourceName}`;

    return {
      ...parsedEdge,
      canonicalName: {
        forward,
        backward,
      },
    };
  });

  return {
    nodes: schema.nodes,
    edges: processedEdges,
  };
}
