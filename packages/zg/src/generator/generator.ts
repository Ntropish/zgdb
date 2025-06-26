import { FbsBuilder } from "@tsmk/fbs-builder";
import { NormalizedSchema } from "../parser/types.js";
import { topologicalSort } from "./topological-sort.js";

/**
 * The main generator function that transforms a complete IR into a single
 * string representing a .fbs file.
 * @param schemas - An array of all normalized schemas, including nested ones.
 * @returns The content of the .fbs file as a string.
 */
export function generateFbs(schemas: NormalizedSchema[]): string {
  const builder = new FbsBuilder();

  const sortedSchemas = topologicalSort(schemas);

  for (const schema of sortedSchemas) {
    builder.table(schema.name, (table) => {
      if (schema.description) {
        table.comment(schema.description);
      }

      if (schema.auth && Object.keys(schema.auth).length > 0) {
        const rules = Object.entries(schema.auth)
          .map(([action, rules]) => {
            if (rules.length === 0) return null;
            const ruleDescriptions = rules
              .map((rule) => {
                if ("policy" in rule) return `    - Policy: ${rule.policy}`;
                return `    - Capability: ${rule.capability}`;
              })
              .join("\n");
            return `  - ${action}: requires ONE OF:\n${ruleDescriptions}`;
          })
          .filter(Boolean)
          .join("\n");

        if (rules) {
          table.comment(`Authorization Rules:\n${rules}`);
        }
      }

      for (const field of schema.fields) {
        table.field(field.name, field.type);
      }

      if (schema.manyToMany && schema.manyToMany.length > 0) {
        for (const rel of schema.manyToMany) {
          table.comment(
            `Many-to-many relationship: '${rel.name}' to node '${rel.node}' through '${rel.through}'`
          );
        }
      }

      return table;
    });
  }

  return builder.toString();
}
