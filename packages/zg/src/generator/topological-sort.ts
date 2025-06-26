import { NormalizedSchema } from "../parser/types.js";

/**
 * Performs a topological sort on the schemas to ensure that
 * dependencies are defined before they are used.
 * @param schemas - The array of normalized schemas.
 * @returns A new array of schemas sorted topologically.
 */
export function topologicalSort(
  schemas: NormalizedSchema[]
): NormalizedSchema[] {
  const sorted: NormalizedSchema[] = [];
  const visited = new Set<string>();
  const graph = new Map<string, string[]>();
  const schemaMap = new Map<string, NormalizedSchema>(
    schemas.map((s) => [s.name, s])
  );

  // Build the dependency graph
  for (const schema of schemas) {
    const dependencies = new Set<string>();
    for (const field of schema.fields) {
      // A dependency is a type that is not a primitive scalar, i.e., it's another table.
      // The type could be 'MyTable' or '[MyTable]'.
      const baseType = field.type.replace(/\[|\]/g, "");
      if (schemaMap.has(baseType) && baseType !== schema.name) {
        dependencies.add(baseType);
      }
    }
    graph.set(schema.name, Array.from(dependencies));
  }

  function visit(schemaName: string) {
    if (visited.has(schemaName)) {
      return;
    }
    visited.add(schemaName);

    const dependencies = graph.get(schemaName) || [];
    for (const dep of dependencies) {
      visit(dep);
    }

    // Add the schema to the sorted list *after* all its dependencies have been visited.
    const schema = schemaMap.get(schemaName);
    if (schema) {
      sorted.push(schema);
    }
  }

  for (const schema of schemas) {
    visit(schema.name);
  }

  return sorted;
}
