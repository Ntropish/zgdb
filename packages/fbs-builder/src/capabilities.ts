import {
  createFluentBuilder,
  FluentBuilder,
  CapabilityMap,
} from "@tsmk/builder";
import { FbsAuthRule, FbsFileState, FbsTableState } from "./types.js";

// Define the state objects
type FileBuilderState = FbsFileState;
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
      build: async (state, tableBuilder, name) => {
        const tableState: FbsTableState = {
          name,
          docs: [],
          fields: [],
          authRules: new Map(),
        };
        // We execute the table builder's pipeline, which mutates the tableState
        await tableBuilder.build(tableState);
        // And then we add the completed table state to the file state
        state.tables.set(name, tableState);
      },
    },
    root_type: {
      build: (state, _, name) => {
        state.rootType = name;
      },
    },
  };

  return createFluentBuilder(capabilities);
}
