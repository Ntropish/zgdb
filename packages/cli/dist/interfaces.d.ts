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
    type: string;
    createdAt: number;
    source: string;
    target: string;
    fields?: Record<string, any>;
}
/**
 * This interface is implemented by the generated code from the build step.
 * The build step generates FlatBuffers serializers specific to the user's schema.
 */
export interface FlatBufferSerializers {
    serializeNode(type: string, data: NodeData): Uint8Array;
    deserializeNode(type: string, buffer: Uint8Array): NodeData;
    serializeEdge(edge: Edge): Uint8Array;
    deserializeEdge(buffer: Uint8Array): Edge;
    getSupportedNodeTypes(): string[];
    getSupportedEdgeTypes(): string[];
}
