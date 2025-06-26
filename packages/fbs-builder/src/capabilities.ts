import {
  createFluentBuilder,
  FluentBuilder,
  CapabilityMap,
} from "@tsmk/builder";
import { FbsAuthRule, FbsTableState } from "./types.js";

// The TProduct for the main builder is an array of rendered string blocks.
type FileBuilderState = string[];
// The TProduct for the table builder is the intermediate state for a single table.
type TableBuilderState = FbsTableState;

// Define the event maps (the methods available on the builders)
type TableEventMap = {
  docs: (prose: string) => void;
  field: (name: string, type: string) => void;
  auth: (name: string, rules: FbsAuthRule[]) => void;
};

type FileEventMap = {
  table: (name: string) => FluentBuilder<TableBuilderState, TableEventMap>;
  root_type: (name: string) => void;
};

// Define typed builders for convenience
export type FbsTableBuilder = FluentBuilder<TableBuilderState, TableEventMap>;
export type FbsFileBuilder = FluentBuilder<FileBuilderState, FileEventMap>;

/**
 * Renders a single, populated FbsTableState object into a string.
 * This is a local helper, not a separate process.
 */
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

/**
 * Creates a stateless builder for configuring an FBS table.
 * It does not hold state, it only defines capabilities.
 */
function createTableBuilder(): FbsTableBuilder {
  const capabilities: CapabilityMap<TableBuilderState, TableEventMap> = {
    docs: {
      build: (state, _, prose) => {
        state.docs.push(prose);
      },
    },
    field: {
      build: (state, _, name, type) => {
        state.fields.push({ name, type });
      },
    },
    auth: {
      build: (state, _, name, rules) => {
        state.authRules.set(name, rules);
      },
    },
  };
  return createFluentBuilder(capabilities);
}

/**
 * Creates the main fluent builder for constructing an FBS file.
 */
export function createFbsBuilder(): FbsFileBuilder {
  const capabilities: CapabilityMap<FileBuilderState, FileEventMap> = {
    table: {
      /**
       * The 'apply' hook is for configuration. It returns a new builder
       * instance to allow for method chaining.
       */
      apply: () => {
        return createTableBuilder();
      },
      /**
       * The 'build' hook is for execution. It receives the file's state,
       * the table builder instance from 'apply', and the original arguments.
       */
      build: async (product, tableBuilder, name) => {
        const tableState: FbsTableState = {
          name,
          docs: [],
          fields: [],
          authRules: new Map(),
        };
        await tableBuilder.build(tableState);
        const renderedTable = renderTable(tableState);
        product.push(renderedTable);
      },
    },
    root_type: {
      build: (product, _, name) => {
        product.push(`root_type ${name};`);
      },
    },
  };

  return createFluentBuilder(capabilities);
}
