/**
 * This interface is implemented by the generated code from the build step
 * The build step generates FlatBuffers serializers specific to the user's schema
 */
export interface FlatBufferSerializers {
    serializeNode(type: string, data: NodeData): Uint8Array;
    deserializeNode(type: string, buffer: Uint8Array): NodeData;
    serializeEdge(edge: Edge): Uint8Array;
    deserializeEdge(buffer: Uint8Array): Edge;
    getSupportedNodeTypes(): string[];
    getSupportedEdgeTypes(): string[];
}
export interface GraphSchema {
    [nodeType: string]: {
        fields: Record<string, any>;
        relations: Record<string, [RelationType, string]>;
    };
}
type RelationType = "one" | "many";
export interface NodeData {
    id: string;
    type: string;
    createdAt: number;
    updatedAt: number;
    fields: Record<string, any>;
    relationIds: Record<string, string | string[]>;
}
export interface Edge {
    id: string;
    type: string;
    from: string;
    to: string;
    createdAt: number;
    data?: Record<string, any>;
}
export {};
