export function logTree(jsonString: string) {
  const tree = JSON.parse(jsonString);
  let output = "";

  function printNode(node: any, prefix = "", isLast = true) {
    const connector = isLast ? "└── " : "├── ";
    const keys =
      node.type === "Leaf"
        ? node.entries.map((e: any) => e.key).join(", ")
        : (node.children || [])
            .map((c: any) => c.key)
            .filter((k: any) => k)
            .join(", ");

    output += `${prefix}${connector}${node.type} (L${
      node.level
    }) @ ${node.address.substring(0, 6)}... | Keys: [${keys}]\n`;

    if (node.type === "Internal") {
      const newPrefix = prefix + (isLast ? "    " : "│   ");
      node.children.forEach((child: any, index: number) => {
        printNode(child.node, newPrefix, index === node.children.length - 1);
      });
    }
  }

  printNode(tree);
  console.log(output);
}
