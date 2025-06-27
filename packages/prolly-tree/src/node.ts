// A content-based address to a block in the BlockStore
export type Address = Uint8Array;

// A key-value pair stored in a leaf node
export type KeyValuePair = [Uint8Array, Uint8Array];

// Leaf nodes store the actual key-value data
export interface LeafNode {
  isLeaf: true;
  pairs: KeyValuePair[];
}

// Internal nodes store keys that guide traversal and addresses to child nodes
export interface InternalNode {
  isLeaf: false;
  keys: Uint8Array[];
  children: Address[];
}

export type Node = LeafNode | InternalNode;

export function isLeafNode(node: Node): node is LeafNode {
  return node.isLeaf;
}

// Simple JSON-based serialization for nodes.
// In a production system, a more efficient binary format like FlatBuffers or Protobuf would be used.
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function serializeNode(node: Node): Uint8Array {
  const replacer = (key: string, value: any) => {
    if (value instanceof Uint8Array) {
      // Convert Uint8Array to a plain array of numbers for JSON serialization
      return Array.from(value);
    }
    return value;
  };
  return textEncoder.encode(JSON.stringify(node, replacer));
}

export function deserializeNode(data: Uint8Array): Node {
  const reviver = (key: string, value: any) => {
    // This is a bit of a heuristic: if a key is known to be a Uint8Array or it's an array of numbers, convert it back.
    if (
      (key === "keys" || key === "children") &&
      Array.isArray(value) &&
      value.every((item) => Array.isArray(item))
    ) {
      return value.map((item) => new Uint8Array(item));
    }
    if (
      key === "pairs" &&
      Array.isArray(value) &&
      value.every(
        (item) =>
          Array.isArray(item) &&
          item.length === 2 &&
          Array.isArray(item[0]) &&
          Array.isArray(item[1])
      )
    ) {
      return value.map(
        (item) =>
          [new Uint8Array(item[0]), new Uint8Array(item[1])] as KeyValuePair
      );
    }
    // Handle single Uint8Array fields if any were added (e.g. for a specific key or address)
    if (value && typeof value === "object" && !Array.isArray(value)) {
      // This part is tricky without knowing the exact structure. The current node types have arrays of Uint8Array.
      // A more robust implementation would have a clearer type schema for serialization.
    }
    return value;
  };
  // A more robust deserialization is needed here. The reviver is complex.
  // For now, let's do a simpler parse and then manually convert.
  const parsed = JSON.parse(textDecoder.decode(data));
  if (parsed.isLeaf) {
    return {
      isLeaf: true,
      pairs: parsed.pairs.map(
        (p: [number[], number[]]) =>
          [new Uint8Array(p[0]), new Uint8Array(p[1])] as KeyValuePair
      ),
    };
  } else {
    return {
      isLeaf: false,
      keys: parsed.keys.map((k: number[]) => new Uint8Array(k)),
      children: parsed.children.map((c: number[]) => new Uint8Array(c)),
    };
  }
}
