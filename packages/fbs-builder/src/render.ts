import { FbsFileState, FbsTableState } from "./types.js";

function renderTable(table: FbsTableState): string {
  const lines: string[] = [];
  if (table.docs.length > 0) {
    lines.push(...table.docs.map((doc) => `/// ${doc}`));
  }

  const authRules: string[] = [];
  for (const [authType, rules] of table.authRules.entries()) {
    const ruleValues = rules.map((r) => `"${r.value}"`).join(", ");
    authRules.push(`${authType}: [${ruleValues}]`);
  }

  if (authRules.length > 0) {
    lines.push(`table ${table.name} (${authRules.join(", ")}) {`);
  } else {
    lines.push(`table ${table.name} {`);
  }

  for (const field of table.fields) {
    lines.push(`  ${field.name}: ${field.type};`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function renderFbsFile(state: FbsFileState): string {
  const fileParts: string[] = [];

  for (const table of state.tables.values()) {
    fileParts.push(renderTable(table));
  }

  if (state.rootType) {
    fileParts.push(`root_type ${state.rootType};`);
  }

  return fileParts.join("\n\n");
}
