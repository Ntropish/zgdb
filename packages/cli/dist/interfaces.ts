/**
 * @file src/interfaces.ts
 * @description Defines shared interfaces for graph nodes, edges, and serializers.
 */

/**
 * Represents a generic node in the graph database.
 */
export interface NodeData {
  id: string;
  type: string;
  createdAt: number;
  updatedAt: number;
  fields: Record<string, any>;
  relationIds: Record<string, string | string[]>;
}

/**
 * Represents a generic edge connecting two nodes in the graph.
 */
export interface Edge {
  id: string;
  type: string; // e.g., 'post_tag_edge'
  createdAt: number;
  source: string; // ID of the source node
  target: string; // ID of the target node
  fields?: Record<string, any>; // Optional additional fields on the edge
}

/**
 * This interface is implemented by the generated code from the build step.
 * The build step generates FlatBuffers serializers specific to the user's schema.
 */
export interface FlatBufferSerializers {
  // Node serialization
  serializeNode(type: string, data: NodeData): Uint8Array;
  deserializeNode(type: string, buffer: Uint8Array): NodeData;

  // Edge serialization (uses generated edge tables)
  serializeEdge(edge: Edge): Uint8Array;
  deserializeEdge(buffer: Uint8Array): Edge;

  // Get supported types
  getSupportedNodeTypes(): string[];
  getSupportedEdgeTypes(): string[];
}
