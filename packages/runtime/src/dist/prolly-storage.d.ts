import { NodeData, GraphSchema, FlatBufferSerializers, Edge } from "./types";
import { PTree } from "prolly-gunna";
import { Observable } from "rxjs";
/**
 * Storage layer implementation using ProllyTree with FlatBuffers
 * This is the generic runtime that works with ANY schema
 */
export declare class ProllyStorage implements Storage {
    private serializers;
    private tree;
    private changes$;
    private mutations$;
    private autoSaveSubscription?;
    private schema?;
    private indexedFields;
    constructor(serializers: FlatBufferSerializers, tree: PTree);
    setSchema(schema: GraphSchema): void;
    private loadSchema;
    private getIndexableFields;
    getNode(id: string): NodeData | undefined;
    getNodes(type: string): NodeData[];
    setNode(node: NodeData): void;
    deleteNode(id: string): void;
    getEdges(nodeId: string, edgeType?: string, direction?: "in" | "out" | "both"): Edge[];
    createEdge(edge: Edge): void;
    deleteEdge(edgeId: string): void;
    queryByIndex(type: string, field: string, value: any): NodeData[];
    changes(): Observable<{
        type: string;
        data: any;
    }>;
    nodeChanges(nodeId?: string): Observable<NodeData>;
    edgeChanges(nodeId?: string): Observable<Edge>;
    save(): Promise<{
        rootHash: Uint8Array;
        chunks: Map<Uint8Array, Uint8Array>;
    }>;
    saveToFile(description?: string): Promise<Uint8Array>;
    static loadFromFile(fileBytes: Uint8Array, serializers: FlatBufferSerializers): Promise<ProllyStorage>;
    transaction<T>(fn: (storage: ProllyStorage) => T | Promise<T>): Promise<T>;
    checkout(rootHash: Uint8Array): Promise<void>;
    diff(leftHash?: Uint8Array | null, rightHash?: Uint8Array | null): Promise<Array<{
        key: Uint8Array;
        left?: any;
        right?: any;
    }>>;
    private getNodeTypes;
    private reverseEdgeKey;
    private getEdgeById;
    private deleteNodeEdges;
    private updateNodeIndexes;
    private deleteNodeIndexes;
    private incrementKey;
    private setupAutoSave;
    dispose(): void;
}
interface Storage {
    getNode(id: string): NodeData | undefined;
    getNodes(type: string): NodeData[];
    getEdges(nodeId: string, edgeType?: string, direction?: "in" | "out" | "both"): Edge[];
    setNode(node: NodeData): void;
    deleteNode(id: string): void;
    createEdge(edge: Edge): void;
    deleteEdge(edgeId: string): void;
}
export {};
