/**
 * Key encoding schemes for the ProllyTree
 * Using a hierarchical key structure for efficient scans
 */
export default class KeyEncoder {
    private static encoder;
    private static decoder;
    static nodeKey(type: string, id: string): Uint8Array;
    static edgeKey(from: string, type: string, to: string, edgeId: string): Uint8Array;
    static indexKey(type: string, field: string, value: any, id: string): Uint8Array;
    static typeScanPrefix(type: string): Uint8Array;
    static edgeScanPrefix(nodeId: string, edgeType?: string): Uint8Array;
    static reverseEdgeScanPrefix(nodeId: string, edgeType?: string): Uint8Array;
    static schemaKey(): Uint8Array;
    static typeMetadataKey(type: string): Uint8Array;
    private static serializeValue;
    static parseNodeId(key: Uint8Array): string | null;
    static parseEdgeKey(key: Uint8Array): {
        from: string;
        type: string;
        to: string;
        id: string;
    } | null;
    static getTypeFromKey(keyStr: string): string | null;
}
