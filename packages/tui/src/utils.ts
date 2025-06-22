import { VNode } from "@tsmk/kernel";

/**
 * Performs a depth-first search to find a node by its ID.
 * @param node The root node to start the search from.
 * @param id The ID of the node to find.
 * @returns The found node, or null if no node with the ID is found.
 */
export function findNodeById(node: VNode, id: string): VNode | null {
  if (node.props?.id === id) {
    return node;
  }
  if (node.props?.children) {
    for (const child of node.props.children) {
      if (typeof child !== "string") {
        const found = findNodeById(child, id);
        if (found) {
          return found;
        }
      }
    }
  }
  return null;
}
