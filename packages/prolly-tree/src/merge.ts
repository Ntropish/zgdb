import { ProllyTree } from "./prolly-tree.js";
import { ConflictResolver } from "./types.js";

export async function merge(
  treeA: ProllyTree,
  treeB: ProllyTree,
  ancestor: ProllyTree,
  resolver: ConflictResolver
): Promise<ProllyTree> {
  const dataA = await treeA._getData();
  const dataB = await treeB._getData();
  const dataAncestor = await ancestor._getData();
  const mergedData = new Map(dataAncestor);

  const allKeys = new Set([
    ...Array.from(dataA.keys()),
    ...Array.from(dataB.keys()),
  ]);
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  for (const key of allKeys) {
    const valA = dataA.get(key);
    const valB = dataB.get(key);
    const valAncestor = dataAncestor.get(key);

    const aExists = valA !== undefined;
    const bExists = valB !== undefined;
    const ancestorExists = valAncestor !== undefined;

    const aChanged = valA?.toString() !== valAncestor?.toString();
    const bChanged = valB?.toString() !== valAncestor?.toString();

    if (aChanged && bChanged) {
      // Conflict
      const resolvedValue = await resolver(
        enc.encode(key),
        valAncestor,
        valA as Uint8Array, // If aChanged, valA must exist
        valB as Uint8Array // If bChanged, valB must exist
      );
      mergedData.set(key, resolvedValue);
    } else if (aChanged) {
      if (aExists) {
        mergedData.set(key, valA);
      } else {
        mergedData.delete(key);
      }
    } else if (bChanged) {
      if (bExists) {
        mergedData.set(key, valB);
      } else {
        mergedData.delete(key);
      }
    }
  }

  const newRootHash = await treeA.store.putData(mergedData);
  const newTree = new ProllyTree(treeA.store, newRootHash, treeA.config);
  newTree._data = mergedData;
  return newTree;
}
