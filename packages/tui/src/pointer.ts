import { TuiHostInstance } from "./reconciler.js";

export function findHoveredNode(
  node: TuiHostInstance,
  x: number,
  y: number
): TuiHostInstance | null {
  function checkNode(currentNode: TuiHostInstance): TuiHostInstance | null {
    if (!currentNode) return null;

    const bounds = (currentNode as any).bounds;
    if (
      bounds &&
      x >= bounds.x &&
      x < bounds.x + bounds.width &&
      y >= bounds.y &&
      y < bounds.y + bounds.height
    ) {
      // It's within bounds, now check children
      const children = currentNode.children || [];
      for (const child of children) {
        const found = checkNode(child);
        if (found) return found;
      }
      return currentNode; // This node is the innermost hovered node
    }
    return null;
  }

  return checkNode(node);
}
