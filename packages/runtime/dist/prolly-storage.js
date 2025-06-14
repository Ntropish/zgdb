"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProllyStorage = void 0;
const prolly_gunna_1 = require("prolly-gunna");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const key_encoder_1 = __importDefault(require("./key-encoder"));
/**
 * Storage layer implementation using ProllyTree with FlatBuffers
 * This is the generic runtime that works with ANY schema
 */
class ProllyStorage {
    serializers;
    tree;
    changes$ = new rxjs_1.Subject();
    mutations$ = new rxjs_1.Subject();
    autoSaveSubscription;
    schema;
    indexedFields = new Map();
    constructor(serializers, tree) {
        this.serializers = serializers;
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
    setSchema(schema) {
        this.schema = schema;
        // Store schema in the tree for persistence
        const schemaKey = key_encoder_1.default.schemaKey();
        const schemaValue = new TextEncoder().encode(JSON.stringify(schema));
        this.tree.insertSync(schemaKey, schemaValue);
        // Set up indexes for each type
        for (const [type, typeDef] of Object.entries(schema)) {
            const indexableFields = this.getIndexableFields(typeDef.fields);
            this.indexedFields.set(type, indexableFields);
            // Store type metadata
            const metaKey = key_encoder_1.default.typeMetadataKey(type);
            const metaValue = new TextEncoder().encode(JSON.stringify({
                indexedFields: Array.from(indexableFields),
            }));
            this.tree.insertSync(metaKey, metaValue);
        }
    }
    loadSchema() {
        const schemaKey = key_encoder_1.default.schemaKey();
        const schemaValue = this.tree.getSync(schemaKey);
        if (schemaValue) {
            this.schema = JSON.parse(new TextDecoder().decode(schemaValue));
            // Load indexed fields for each type
            for (const type of Object.keys(this.schema)) {
                const metaKey = key_encoder_1.default.typeMetadataKey(type);
                const metaValue = this.tree.getSync(metaKey);
                if (metaValue) {
                    const meta = JSON.parse(new TextDecoder().decode(metaValue));
                    this.indexedFields.set(type, new Set(meta.indexedFields));
                }
            }
        }
    }
    getIndexableFields(fields) {
        // In a real implementation, this would be configurable
        // For now, index string and number fields
        const indexable = new Set();
        for (const [field, schema] of Object.entries(fields)) {
            // This is simplified - would need to check actual Zod schema types
            indexable.add(field);
        }
        return indexable;
    }
    // ============================================
    // Node Operations with FlatBuffers
    // ============================================
    getNode(id) {
        // Try each supported type from the serializers
        const types = this.serializers.getSupportedTypes();
        for (const type of types) {
            const key = key_encoder_1.default.nodeKey(type, id);
            const value = this.tree.getSync(key);
            if (value) {
                try {
                    return this.serializers.deserializeNode(type, value);
                }
                catch (e) {
                    console.error(`Failed to deserialize ${type} node:`, e);
                }
            }
        }
        return undefined;
    }
    getNodes(type) {
        const prefix = key_encoder_1.default.typeScanPrefix(type);
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
            }
            catch (e) {
                console.error(`Failed to deserialize node:`, e);
                return null;
            }
        })
            .filter((node) => node !== null);
    }
    setNode(node) {
        const key = key_encoder_1.default.nodeKey(node.type, node.id);
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
    deleteNode(id) {
        const node = this.getNode(id);
        if (!node)
            return;
        // Delete the node
        const key = key_encoder_1.default.nodeKey(node.type, id);
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
    getEdges(nodeId, edgeType, direction = "both") {
        const edges = [];
        // Get outgoing edges
        if (direction === "out" || direction === "both") {
            const prefix = key_encoder_1.default.edgeScanPrefix(nodeId, edgeType);
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
                }
                catch (e) {
                    console.error("Failed to deserialize edge:", e);
                }
            }
        }
        // Get incoming edges
        if (direction === "in" || direction === "both") {
            const prefix = key_encoder_1.default.reverseEdgeScanPrefix(nodeId, edgeType);
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
    createEdge(edge) {
        // Store the edge with FlatBuffers
        const key = key_encoder_1.default.edgeKey(edge.from, edge.type, edge.to, edge.id);
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
    deleteEdge(edgeId) {
        // Find the edge first
        const edge = this.getEdgeById(edgeId);
        if (!edge)
            return;
        // Delete the edge
        const key = key_encoder_1.default.edgeKey(edge.from, edge.type, edge.to, edge.id);
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
    queryByIndex(type, field, value) {
        const indexKey = key_encoder_1.default.indexKey(type, field, value, "");
        const endKey = key_encoder_1.default.indexKey(type, field, value, "\uffff");
        const scanResult = this.tree.scanItemsSync({
            startBound: indexKey,
            endBound: endKey,
            startInclusive: true,
            endInclusive: false,
        });
        const nodeIds = scanResult.items.map(([_, idBuffer]) => new TextDecoder().decode(idBuffer));
        return nodeIds
            .map((id) => this.getNode(id))
            .filter((node) => node !== undefined);
    }
    // ============================================
    // Observable API
    // ============================================
    changes() {
        return this.changes$.asObservable();
    }
    nodeChanges(nodeId) {
        return this.changes$.pipe((0, operators_1.filter)((change) => change.type === "node-set"), (0, operators_1.map)((change) => change.data), (0, operators_1.filter)((node) => !nodeId || node.id === nodeId));
    }
    edgeChanges(nodeId) {
        return this.changes$.pipe((0, operators_1.filter)((change) => change.type === "edge-create" || change.type === "edge-delete"), (0, operators_1.map)((change) => change.data), (0, operators_1.filter)((edge) => !nodeId || edge.from === nodeId || edge.to === nodeId));
    }
    // ============================================
    // Persistence Operations
    // ============================================
    async save() {
        const rootHash = await this.tree.getRootHash();
        const chunks = await this.tree.exportChunks();
        return { rootHash: rootHash ?? new Uint8Array(), chunks };
    }
    async saveToFile(description) {
        return await this.tree.saveTreeToFileBytes(description);
    }
    static async loadFromFile(fileBytes, serializers) {
        const tree = await prolly_gunna_1.PTree.loadTreeFromFileBytes(fileBytes);
        return new ProllyStorage(serializers, tree);
    }
    // ============================================
    // Transaction Support
    // ============================================
    async transaction(fn) {
        // Save current state
        const checkpoint = await this.tree.getRootHash();
        try {
            // Execute transaction
            const result = await fn(this);
            return result;
        }
        catch (error) {
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
    async checkout(rootHash) {
        await this.tree.checkout(rootHash);
        this.changes$.next({
            type: "checkout",
            data: { rootHash },
        });
    }
    async diff(leftHash, rightHash) {
        const diffs = await this.tree.diffRoots(leftHash, rightHash);
        return diffs.map((diff) => {
            let left, right;
            // Deserialize the values if they exist
            if (diff.leftValue) {
                try {
                    const keyStr = new TextDecoder().decode(diff.key);
                    const type = key_encoder_1.default.getTypeFromKey(keyStr);
                    if (type && this.serializers.getSupportedTypes().includes(type)) {
                        left = this.serializers.deserializeNode(type, diff.leftValue);
                    }
                    else if (keyStr.startsWith("e:")) {
                        left = this.serializers.deserializeEdge(diff.leftValue);
                    }
                    else {
                        left = diff.leftValue;
                    }
                }
                catch {
                    left = diff.leftValue;
                }
            }
            if (diff.rightValue) {
                try {
                    const keyStr = new TextDecoder().decode(diff.key);
                    const type = key_encoder_1.default.getTypeFromKey(keyStr);
                    if (type && this.serializers.getSupportedTypes().includes(type)) {
                        right = this.serializers.deserializeNode(type, diff.rightValue);
                    }
                    else if (keyStr.startsWith("e:")) {
                        right = this.serializers.deserializeEdge(diff.rightValue);
                    }
                    else {
                        right = diff.rightValue;
                    }
                }
                catch {
                    right = diff.rightValue;
                }
            }
            return { key: diff.key, left, right };
        });
    }
    // ============================================
    // Private Helpers
    // ============================================
    getNodeTypes() {
        return this.serializers.getSupportedTypes();
    }
    reverseEdgeKey(edge) {
        return new TextEncoder().encode(`r:${edge.to}:${edge.type}:${edge.from}:${edge.id}`);
    }
    getEdgeById(edgeId) {
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
            }
            catch {
                // Skip invalid edges
            }
        }
        return null;
    }
    deleteNodeEdges(nodeId) {
        const edges = this.getEdges(nodeId, undefined, "both");
        for (const edge of edges) {
            this.deleteEdge(edge.id);
        }
    }
    updateNodeIndexes(node) {
        const indexedFields = this.indexedFields.get(node.type) || new Set();
        for (const field of indexedFields) {
            if (field in node.fields) {
                const key = key_encoder_1.default.indexKey(node.type, field, node.fields[field], node.id);
                const value = new TextEncoder().encode(node.id);
                this.tree.insertSync(key, value);
            }
        }
    }
    deleteNodeIndexes(node) {
        const indexedFields = this.indexedFields.get(node.type) || new Set();
        for (const field of indexedFields) {
            if (field in node.fields) {
                const key = key_encoder_1.default.indexKey(node.type, field, node.fields[field], node.id);
                this.tree.deleteSync(key);
            }
        }
    }
    incrementKey(key) {
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
    setupAutoSave(debounceMs) {
        this.autoSaveSubscription = this.mutations$
            .pipe((0, operators_1.debounceTime)(debounceMs), (0, operators_1.buffer)(this.mutations$.pipe((0, operators_1.debounceTime)(debounceMs))))
            .subscribe(async () => {
            try {
                const { rootHash } = await this.save();
                console.log("Auto-saved with root hash:", rootHash);
            }
            catch (error) {
                console.error("Auto-save failed:", error);
            }
        });
    }
    dispose() {
        this.autoSaveSubscription?.unsubscribe();
        this.changes$.complete();
        this.mutations$.complete();
        this.tree.free();
    }
}
exports.ProllyStorage = ProllyStorage;
