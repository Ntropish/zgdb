import { NodeData, GraphSchema, FlatBufferSerializers, Edge } from "./types";

import { PTree, TreeConfigOptions, BatchItem, ScanOptions } from "prolly-gunna";
import { Subject, Observable, from, merge } from "rxjs";
import { filter, map, debounceTime, buffer } from "rxjs/operators";
import { flatbuffers } from "flatbuffers";
import KeyEncoder from "./key-encoder";

/**
 * Storage layer implementation using ProllyTree with FlatBuffers
 * This is the generic runtime that works with ANY schema
 */
export class ProllyStorage implements Storage {
  private tree: PTree;
  private changes$ = new Subject<{ type: string; data: any }>();
  private mutations$ = new Subject<void>();
  private autoSaveSubscription?: any;
  private schema?: GraphSchema;
  private indexedFields: Map<string, Set<string>> = new Map();

  constructor(private serializers: FlatBufferSerializers, tree: PTree) {
    this.tree = tree;

    // Listen to tree changes
    this.tree.onChange((event) => {
      this.changes$.next({
        type: "tree-change",
        data: event,
      });
    });

    // Load schema if it exists
    this.loadSchema();
  }

  // ============================================
  // Schema Management
  // ============================================

  setSchema(schema: GraphSchema): void {
    this.schema = schema;

    // Store schema in the tree for persistence
    const schemaKey = KeyEncoder.schemaKey();
    const schemaValue = new TextEncoder().encode(JSON.stringify(schema));
    this.tree.insertSync(schemaKey, schemaValue);

    // Set up indexes for each type
    for (const [type, typeDef] of Object.entries(schema)) {
      const indexableFields = this.getIndexableFields(typeDef.fields);
      this.indexedFields.set(type, indexableFields);

      // Store type metadata
      const metaKey = KeyEncoder.typeMetadataKey(type);
      const metaValue = new TextEncoder().encode(
        JSON.stringify({
          indexedFields: Array.from(indexableFields),
        })
      );
      this.tree.insertSync(metaKey, metaValue);
    }
  }

  private loadSchema(): void {
    const schemaKey = KeyEncoder.schemaKey();
    const schemaValue = this.tree.getSync(schemaKey);

    if (schemaValue) {
      this.schema = JSON.parse(new TextDecoder().decode(schemaValue));

      // Load indexed fields for each type
      for (const type of Object.keys(this.schema!)) {
        const metaKey = KeyEncoder.typeMetadataKey(type);
        const metaValue = this.tree.getSync(metaKey);

        if (metaValue) {
          const meta = JSON.parse(new TextDecoder().decode(metaValue));
          this.indexedFields.set(type, new Set(meta.indexedFields));
        }
      }
    }
  }

  private getIndexableFields(fields: Record<string, any>): Set<string> {
    // In a real implementation, this would be configurable
    // For now, index string and number fields
    const indexable = new Set<string>();

    for (const [field, schema] of Object.entries(fields)) {
      // This is simplified - would need to check actual Zod schema types
      indexable.add(field);
    }

    return indexable;
  }

  // ============================================
  // Node Operations with FlatBuffers
  // ============================================

  getNode(id: string): NodeData | undefined {
    // Try each supported type from the serializers
    const types = this.serializers.getSupportedTypes();

    for (const type of types) {
      const key = KeyEncoder.nodeKey(type, id);
      const value = this.tree.getSync(key);

      if (value) {
        try {
          return this.serializers.deserializeNode(type, value);
        } catch (e) {
          console.error(`Failed to deserialize ${type} node:`, e);
        }
      }
    }

    return undefined;
  }

  getNodes(type: string): NodeData[] {
    const prefix = KeyEncoder.typeScanPrefix(type);
    const scanResult = this.tree.scanItemsSync({
      startBound: prefix,
      endBound: this.incrementKey(prefix),
      startInclusive: true,
      endInclusive: false,
    });

    return scanResult.items
      .map(([key, value]) => {
        try {
          return this.serializers.deserializeNode(type, value);
        } catch (e) {
          console.error(`Failed to deserialize node:`, e);
          return null;
        }
      })
      .filter((node) => node !== null);
  }

  setNode(node: NodeData): void {
    const key = KeyEncoder.nodeKey(node.type, node.id);
    const value = this.serializers.serializeNode(node.type, node);

    this.tree.insertSync(key, value);

    // Update indexes
    this.updateNodeIndexes(node);

    // Emit change
    this.changes$.next({
      type: "node-set",
      data: node,
    });

    this.mutations$.next();
  }

  deleteNode(id: string): void {
    const node = this.getNode(id);
    if (!node) return;

    // Delete the node
    const key = KeyEncoder.nodeKey(node.type, id);
    this.tree.deleteSync(key);

    // Delete indexes
    this.deleteNodeIndexes(node);

    // Delete all edges
    this.deleteNodeEdges(id);

    // Emit change
    this.changes$.next({
      type: "node-delete",
      data: { id, type: node.type },
    });

    this.mutations$.next();
  }

  // ============================================
  // Edge Operations with FlatBuffers
  // ============================================

  getEdges(
    nodeId: string,
    edgeType?: string,
    direction: "in" | "out" | "both" = "both"
  ): Edge[] {
    const edges: Edge[] = [];

    // Get outgoing edges
    if (direction === "out" || direction === "both") {
      const prefix = KeyEncoder.edgeScanPrefix(nodeId, edgeType);
      const scanResult = this.tree.scanItemsSync({
        startBound: prefix,
        endBound: this.incrementKey(prefix),
        startInclusive: true,
        endInclusive: false,
      });

      for (const [key, value] of scanResult.items) {
        try {
          const edge = this.serializers.deserializeEdge(value);
          if (edge) {
            edges.push(edge);
          }
        } catch (e) {
          console.error("Failed to deserialize edge:", e);
        }
      }
    }

    // Get incoming edges
    if (direction === "in" || direction === "both") {
      const prefix = KeyEncoder.reverseEdgeScanPrefix(nodeId, edgeType);
      const scanResult = this.tree.scanItemsSync({
        startBound: prefix,
        endBound: this.incrementKey(prefix),
        startInclusive: true,
        endInclusive: false,
      });

      for (const [key, value] of scanResult.items) {
        // The value contains the edge ID
        const edgeId = new TextDecoder().decode(value);
        const edge = this.getEdgeById(edgeId);
        if (edge && !edges.some((e) => e.id === edge.id)) {
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  createEdge(edge: Edge): void {
    // Store the edge with FlatBuffers
    const key = KeyEncoder.edgeKey(edge.from, edge.type, edge.to, edge.id);
    const value = this.serializers.serializeEdge(edge);

    // Also store reverse index for incoming edges
    const reverseKey = this.reverseEdgeKey(edge);
    const reverseValue = new TextEncoder().encode(edge.id);

    // Batch insert both
    this.tree.insertBatch([
      [key, value],
      [reverseKey, reverseValue],
    ]);

    // Emit change
    this.changes$.next({
      type: "edge-create",
      data: edge,
    });

    this.mutations$.next();
  }

  deleteEdge(edgeId: string): void {
    // Find the edge first
    const edge = this.getEdgeById(edgeId);
    if (!edge) return;

    // Delete the edge
    const key = KeyEncoder.edgeKey(edge.from, edge.type, edge.to, edge.id);
    this.tree.deleteSync(key);

    // Delete reverse index
    const reverseKey = this.reverseEdgeKey(edge);
    this.tree.deleteSync(reverseKey);

    // Emit change
    this.changes$.next({
      type: "edge-delete",
      data: edge,
    });

    this.mutations$.next();
  }

  // ============================================
  // Query Support
  // ============================================

  queryByIndex(type: string, field: string, value: any): NodeData[] {
    const indexKey = KeyEncoder.indexKey(type, field, value, "");
    const endKey = KeyEncoder.indexKey(type, field, value, "\uffff");

    const scanResult = this.tree.scanItemsSync({
      startBound: indexKey,
      endBound: endKey,
      startInclusive: true,
      endInclusive: false,
    });

    const nodeIds = scanResult.items.map(([_, idBuffer]) =>
      new TextDecoder().decode(idBuffer)
    );

    return nodeIds
      .map((id) => this.getNode(id))
      .filter((node) => node !== undefined) as NodeData[];
  }

  // ============================================
  // Observable API
  // ============================================

  changes(): Observable<{ type: string; data: any }> {
    return this.changes$.asObservable();
  }

  nodeChanges(nodeId?: string): Observable<NodeData> {
    return this.changes$.pipe(
      filter((change) => change.type === "node-set"),
      map((change) => change.data),
      filter((node) => !nodeId || node.id === nodeId)
    );
  }

  edgeChanges(nodeId?: string): Observable<Edge> {
    return this.changes$.pipe(
      filter(
        (change) =>
          change.type === "edge-create" || change.type === "edge-delete"
      ),
      map((change) => change.data),
      filter((edge) => !nodeId || edge.from === nodeId || edge.to === nodeId)
    );
  }

  // ============================================
  // Persistence Operations
  // ============================================

  async save(): Promise<{
    rootHash: Uint8Array;
    chunks: Map<Uint8Array, Uint8Array>;
  }> {
    const rootHash = await this.tree.getRootHash();
    const chunks = await this.tree.exportChunks();

    return { rootHash: rootHash ?? new Uint8Array(), chunks };
  }

  async saveToFile(description?: string): Promise<Uint8Array> {
    return await this.tree.saveTreeToFileBytes(description);
  }

  static async loadFromFile(
    fileBytes: Uint8Array,
    serializers: FlatBufferSerializers
  ): Promise<ProllyStorage> {
    const tree = await PTree.loadTreeFromFileBytes(fileBytes);
    return new ProllyStorage(serializers, tree);
  }

  // ============================================
  // Transaction Support
  // ============================================

  async transaction<T>(
    fn: (storage: ProllyStorage) => T | Promise<T>
  ): Promise<T> {
    // Save current state
    const checkpoint = await this.tree.getRootHash();

    try {
      // Execute transaction
      const result = await fn(this);
      return result;
    } catch (error) {
      // Rollback on error
      if (checkpoint) {
        await this.tree.checkout(checkpoint);
      }
      throw error;
    }
  }

  // ============================================
  // Time Travel
  // ============================================

  async checkout(rootHash: Uint8Array): Promise<void> {
    await this.tree.checkout(rootHash);

    this.changes$.next({
      type: "checkout",
      data: { rootHash },
    });
  }

  async diff(
    leftHash?: Uint8Array | null,
    rightHash?: Uint8Array | null
  ): Promise<Array<{ key: Uint8Array; left?: any; right?: any }>> {
    const diffs = await this.tree.diffRoots(leftHash, rightHash);

    return diffs.map((diff) => {
      let left, right;

      // Deserialize the values if they exist
      if (diff.leftValue) {
        try {
          const keyStr = new TextDecoder().decode(diff.key);
          const type = KeyEncoder.getTypeFromKey(keyStr);
          if (type && this.serializers.getSupportedTypes().includes(type)) {
            left = this.serializers.deserializeNode(type, diff.leftValue);
          } else if (keyStr.startsWith("e:")) {
            left = this.serializers.deserializeEdge(diff.leftValue);
          } else {
            left = diff.leftValue;
          }
        } catch {
          left = diff.leftValue;
        }
      }

      if (diff.rightValue) {
        try {
          const keyStr = new TextDecoder().decode(diff.key);
          const type = KeyEncoder.getTypeFromKey(keyStr);
          if (type && this.serializers.getSupportedTypes().includes(type)) {
            right = this.serializers.deserializeNode(type, diff.rightValue);
          } else if (keyStr.startsWith("e:")) {
            right = this.serializers.deserializeEdge(diff.rightValue);
          } else {
            right = diff.rightValue;
          }
        } catch {
          right = diff.rightValue;
        }
      }

      return { key: diff.key, left, right };
    });
  }

  // ============================================
  // Private Helpers
  // ============================================

  private getNodeTypes(): string[] {
    return this.serializers.getSupportedTypes();
  }

  private reverseEdgeKey(edge: Edge): Uint8Array {
    return new TextEncoder().encode(
      `r:${edge.to}:${edge.type}:${edge.from}:${edge.id}`
    );
  }

  private getEdgeById(edgeId: string): Edge | null {
    // This is inefficient - in production, maintain an edge ID index
    const prefix = new TextEncoder().encode("e:");
    const scanResult = this.tree.scanItemsSync({
      startBound: prefix,
      endBound: this.incrementKey(prefix),
      startInclusive: true,
      endInclusive: false,
    });

    for (const [key, value] of scanResult.items) {
      try {
        const edge = this.serializers.deserializeEdge(value);
        if (edge && edge.id === edgeId) {
          return edge;
        }
      } catch {
        // Skip invalid edges
      }
    }

    return null;
  }

  private deleteNodeEdges(nodeId: string): void {
    const edges = this.getEdges(nodeId, undefined, "both");
    for (const edge of edges) {
      this.deleteEdge(edge.id);
    }
  }

  private updateNodeIndexes(node: NodeData): void {
    const indexedFields = this.indexedFields.get(node.type) || new Set();

    for (const field of indexedFields) {
      if (field in node.fields) {
        const key = KeyEncoder.indexKey(
          node.type,
          field,
          node.fields[field],
          node.id
        );
        const value = new TextEncoder().encode(node.id);
        this.tree.insertSync(key, value);
      }
    }
  }

  private deleteNodeIndexes(node: NodeData): void {
    const indexedFields = this.indexedFields.get(node.type) || new Set();

    for (const field of indexedFields) {
      if (field in node.fields) {
        const key = KeyEncoder.indexKey(
          node.type,
          field,
          node.fields[field],
          node.id
        );
        this.tree.deleteSync(key);
      }
    }
  }

  private incrementKey(key: Uint8Array): Uint8Array {
    const result = new Uint8Array(key);
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i] < 255) {
        result[i]++;
        break;
      }
      result[i] = 0;
    }
    return result;
  }

  private setupAutoSave(debounceMs: number): void {
    this.autoSaveSubscription = this.mutations$
      .pipe(
        debounceTime(debounceMs),
        buffer(this.mutations$.pipe(debounceTime(debounceMs)))
      )
      .subscribe(async () => {
        try {
          const { rootHash } = await this.save();
          console.log("Auto-saved with root hash:", rootHash);
        } catch (error) {
          console.error("Auto-save failed:", error);
        }
      });
  }

  dispose(): void {
    this.autoSaveSubscription?.unsubscribe();
    this.changes$.complete();
    this.mutations$.complete();
    this.tree.free();
  }
}

// ============================================
// Storage Interface
// ============================================

interface Storage {
  getNode(id: string): NodeData | undefined;
  getNodes(type: string): NodeData[];
  getEdges(
    nodeId: string,
    edgeType?: string,
    direction?: "in" | "out" | "both"
  ): Edge[];

  setNode(node: NodeData): void;
  deleteNode(id: string): void;

  createEdge(edge: Edge): void;
  deleteEdge(edgeId: string): void;
}
