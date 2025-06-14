"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Key encoding schemes for the ProllyTree
 * Using a hierarchical key structure for efficient scans
 */
class KeyEncoder {
    static encoder = new TextEncoder();
    static decoder = new TextDecoder();
    // Node key: "n:<type>:<id>"
    static nodeKey(type, id) {
        return this.encoder.encode(`n:${type}:${id}`);
    }
    // Edge key: "e:<from>:<type>:<to>:<edge_id>"
    static edgeKey(from, type, to, edgeId) {
        return this.encoder.encode(`e:${from}:${type}:${to}:${edgeId}`);
    }
    // Index key: "i:<type>:<field>:<value>:<id>"
    static indexKey(type, field, value, id) {
        const serializedValue = this.serializeValue(value);
        return this.encoder.encode(`i:${type}:${field}:${serializedValue}:${id}`);
    }
    // Type scan prefix: "n:<type>:"
    static typeScanPrefix(type) {
        return this.encoder.encode(`n:${type}:`);
    }
    // Edge scan prefix: "e:<nodeId>:"
    static edgeScanPrefix(nodeId, edgeType) {
        const prefix = edgeType ? `e:${nodeId}:${edgeType}:` : `e:${nodeId}:`;
        return this.encoder.encode(prefix);
    }
    // Reverse edge scan prefix: "r:<nodeId>:"
    static reverseEdgeScanPrefix(nodeId, edgeType) {
        const prefix = edgeType ? `r:${nodeId}:${edgeType}:` : `r:${nodeId}:`;
        return this.encoder.encode(prefix);
    }
    // Schema metadata key: "m:schema"
    static schemaKey() {
        return this.encoder.encode("m:schema");
    }
    // Type metadata key: "m:types:<type>"
    static typeMetadataKey(type) {
        return this.encoder.encode(`m:types:${type}`);
    }
    static serializeValue(value) {
        if (value === null)
            return "null";
        if (value === undefined)
            return "undefined";
        if (typeof value === "string")
            return value;
        if (typeof value === "number")
            return value.toString();
        if (typeof value === "boolean")
            return value.toString();
        if (value instanceof Date)
            return value.toISOString();
        return JSON.stringify(value);
    }
    static parseNodeId(key) {
        const keyStr = this.decoder.decode(key);
        const match = keyStr.match(/^n:[^:]+:(.+)$/);
        return match ? match[1] : null;
    }
    static parseEdgeKey(key) {
        const keyStr = this.decoder.decode(key);
        const match = keyStr.match(/^e:([^:]+):([^:]+):([^:]+):(.+)$/);
        if (match) {
            return {
                from: match[1],
                type: match[2],
                to: match[3],
                id: match[4],
            };
        }
        return null;
    }
    static getTypeFromKey(keyStr) {
        const match = keyStr.match(/^n:([^:]+):/);
        return match ? match[1] : null;
    }
}
exports.default = KeyEncoder;
