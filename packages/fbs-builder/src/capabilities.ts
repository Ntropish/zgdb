import {
  createFluentBuilder,
  FluentBuilder,
  CapabilityMap,
} from "@tsmk/builder";
import {
  FbsAuthRule,
  FbsTableState,
  FbsFileState,
  FbsStructState,
  FbsEnumState,
  FbsUnionState,
  FbsScalar,
  FbsField,
  FbsType,
  FbsDeclaration,
} from "./types.js";

// The TProduct for the main builder is the FbsFileState object.
type FileBuilderState = FbsFileState;
// The TProduct for the various builders is their intermediate state.
type TableBuilderState = FbsTableState;
type StructBuilderState = FbsStructState;
type EnumBuilderState = FbsEnumState;
type UnionBuilderState = FbsUnionState;

// Define the event maps (the methods available on the builders)
type EnumEventMap = {
  docs: (prose: string) => void;
  value: (name: string, value: number) => void;
};

type UnionEventMap = {
  docs: (prose: string) => void;
  value: (table: string) => void;
};

type StructEventMap = {
  docs: (prose: string) => void;
  field: (name: string, type: FbsType, isVector?: boolean) => void;
};

type TableEventMap = {
  docs: (prose: string) => void;
  field: (
    name: string,
    type: FbsType,
    options?: {
      defaultValue?: any;
      isVector?: boolean;
      attributes?: Record<string, string | boolean>;
    }
  ) => void;
  attribute: (name: string, value: string | boolean) => void;
  auth: (name: string, rules: FbsAuthRule[]) => void;
};

type FileEventMap = {
  namespace: (name: string) => void;
  include: (filename: string) => void;
  table: (name: string) => FluentBuilder<TableBuilderState, TableEventMap>;
  struct: (name: string) => FluentBuilder<StructBuilderState, StructEventMap>;
  enum: (
    name: string,
    type: FbsScalar
  ) => FluentBuilder<EnumBuilderState, EnumEventMap>;
  union: (name: string) => FluentBuilder<UnionBuilderState, UnionEventMap>;
  root_type: (name: string) => void;
  file_identifier: (id: string) => void;
  file_extension: (ext: string) => void;
};

// Define typed builders for convenience
export type FbsTableBuilder = FluentBuilder<TableBuilderState, TableEventMap>;
export type FbsStructBuilder = FluentBuilder<
  StructBuilderState,
  StructEventMap
>;
export type FbsEnumBuilder = FluentBuilder<EnumBuilderState, EnumEventMap>;
export type FbsUnionBuilder = FluentBuilder<UnionBuilderState, UnionEventMap>;
export type FbsFileBuilder = FluentBuilder<FileBuilderState, FileEventMap>;

function renderField(field: FbsField): string {
  const typeStr = field.isVector ? `[${field.type}]` : field.type;
  let fieldDef = `${field.name}: ${typeStr}`;
  if (field.defaultValue !== undefined) {
    const value =
      typeof field.defaultValue === "string"
        ? `"${field.defaultValue}"`
        : field.defaultValue;
    fieldDef += ` = ${value}`;
  }
  if (field.attributes.size > 0) {
    const attrs = Array.from(field.attributes.entries())
      .map(([key, value]) => (value === true ? key : `${key}: "${value}"`))
      .join(", ");
    fieldDef += ` (${attrs})`;
  }
  return `${fieldDef};`;
}

function renderDocs(docs: string[]): string[] {
  return docs.map((doc) => `/// ${doc}`);
}

function renderTable(table: FbsTableState): string {
  const lines: string[] = [];
  lines.push(...renderDocs(table.docs));

  const tableAttributes: string[] = [];
  for (const [key, value] of table.attributes.entries()) {
    tableAttributes.push(value === true ? key : `${key}: "${value}"`);
  }

  // Handle custom auth rules by converting them to a metadata attribute
  if (table.authRules.size > 0) {
    const authEntries: string[] = [];
    for (const [authType, rules] of table.authRules.entries()) {
      const ruleValues = rules.map((r) => `"${r.value}"`).join(", ");
      authEntries.push(`${authType}: [${ruleValues}]`);
    }
    tableAttributes.push(`auth: { ${authEntries.join(", ")} }`);
  }

  const attrStr =
    tableAttributes.length > 0 ? ` (${tableAttributes.join(", ")})` : "";
  lines.push(`table ${table.name}${attrStr} {`);

  for (const field of table.fields) {
    lines.push(`  ${renderField(field)}`);
  }
  lines.push("}");
  return lines.join("\n");
}

function renderStruct(struct: FbsStructState): string {
  const lines: string[] = [];
  lines.push(...renderDocs(struct.docs));
  lines.push(`struct ${struct.name} {`);
  for (const field of struct.fields) {
    // Note: Fields in structs are simpler, no attributes or default values
    const typeStr = field.isVector ? `[${field.type}]` : field.type;
    lines.push(`  ${field.name}: ${typeStr};`);
  }
  lines.push("}");
  return lines.join("\n");
}

function renderEnum(e: FbsEnumState): string {
  const lines: string[] = [];
  lines.push(...renderDocs(e.docs));
  lines.push(`enum ${e.name}: ${e.type} {`);
  for (const [name, value] of e.values.entries()) {
    lines.push(`  ${name} = ${value},`);
  }
  lines.push("}");
  return lines.join("\n");
}

function renderUnion(u: FbsUnionState): string {
  const lines: string[] = [];
  lines.push(...renderDocs(u.docs));
  lines.push(`union ${u.name} {`);
  for (const value of u.values) {
    lines.push(`  ${value},`);
  }
  lines.push("}");
  return lines.join("\n");
}

export function renderFbs(fileState: FbsFileState): string {
  const lines: string[] = [];
  if (fileState.namespace) {
    lines.push(`namespace ${fileState.namespace};`);
  }
  if (fileState.includes.length > 0) {
    lines.push(...fileState.includes.map((inc) => `include "${inc}";`));
    lines.push(""); // for spacing
  }

  for (const decl of fileState.declarations) {
    switch (decl.kind) {
      case "table":
        lines.push(renderTable(decl as FbsTableState));
        break;
      case "struct":
        lines.push(renderStruct(decl as FbsStructState));
        break;
      case "enum":
        lines.push(renderEnum(decl as FbsEnumState));
        break;
      case "union":
        lines.push(renderUnion(decl as FbsUnionState));
        break;
    }
    lines.push(""); // for spacing
  }

  if (fileState.rootType) {
    lines.push(`root_type ${fileState.rootType};`);
  }
  if (fileState.fileIdentifier) {
    lines.push(`file_identifier "${fileState.fileIdentifier}";`);
  }
  if (fileState.fileExtension) {
    lines.push(`file_extension "${fileState.fileExtension}";`);
  }

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
      build: (state, _, name, type, options = {}) => {
        const { defaultValue, isVector = false, attributes = {} } = options;
        const attrMap = new Map(Object.entries(attributes));
        state.fields.push({
          name,
          type,
          defaultValue,
          isVector,
          attributes: attrMap,
        });
      },
    },
    attribute: {
      build: (state, _, name, value) => {
        state.attributes.set(name, value);
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

function createStructBuilder(): FbsStructBuilder {
  const capabilities: CapabilityMap<StructBuilderState, StructEventMap> = {
    docs: {
      build: (state, _, prose) => {
        state.docs.push(prose);
      },
    },
    field: {
      build: (state, _, name, type, isVector = false) => {
        state.fields.push({
          name,
          type,
          isVector,
          attributes: new Map(), // not used in struct fields
        });
      },
    },
  };
  return createFluentBuilder(capabilities);
}

function createEnumBuilder(): FbsEnumBuilder {
  const capabilities: CapabilityMap<EnumBuilderState, EnumEventMap> = {
    docs: {
      build: (state, _, prose) => {
        state.docs.push(prose);
      },
    },
    value: {
      build: (state, _, name, value) => {
        state.values.set(name, value);
      },
    },
  };
  return createFluentBuilder(capabilities);
}

function createUnionBuilder(): FbsUnionBuilder {
  const capabilities: CapabilityMap<UnionBuilderState, UnionEventMap> = {
    docs: {
      build: (state, _, prose) => {
        state.docs.push(prose);
      },
    },
    value: {
      build: (state, _, table) => {
        state.values.push(table);
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
    namespace: {
      build: (product, _, name) => {
        product.namespace = name;
      },
    },
    include: {
      build: (product, _, filename) => {
        product.includes.push(filename);
      },
    },
    table: {
      apply: () => createTableBuilder(),
      build: async (product, tableBuilder, name) => {
        const tableState: FbsTableState = {
          kind: "table",
          name,
          docs: [],
          fields: [],
          attributes: new Map(),
          authRules: new Map(),
        };
        await tableBuilder.build(tableState);
        product.declarations.push(tableState);
      },
    },
    struct: {
      apply: () => createStructBuilder(),
      build: async (product, structBuilder, name) => {
        const structState: FbsStructState = {
          kind: "struct",
          name,
          docs: [],
          fields: [],
        };
        await structBuilder.build(structState);
        product.declarations.push(structState);
      },
    },
    enum: {
      apply: () => createEnumBuilder(),
      build: async (product, enumBuilder, name, type) => {
        const enumState: FbsEnumState = {
          kind: "enum",
          name,
          docs: [],
          type,
          values: new Map(),
        };
        await enumBuilder.build(enumState);
        product.declarations.push(enumState);
      },
    },
    union: {
      apply: () => createUnionBuilder(),
      build: async (product, unionBuilder, name) => {
        const unionState: FbsUnionState = {
          kind: "union",
          name,
          docs: [],
          values: [],
        };
        await unionBuilder.build(unionState);
        product.declarations.push(unionState);
      },
    },
    root_type: {
      build: (product, _, name) => {
        product.rootType = name;
      },
    },
    file_identifier: {
      build: (product, _, id) => {
        product.fileIdentifier = id;
      },
    },
    file_extension: {
      build: (product, _, ext) => {
        product.fileExtension = ext;
      },
    },
  };

  return createFluentBuilder(capabilities);
}

export function createInitialFbsFileState(): FbsFileState {
  return {
    namespace: null,
    includes: [],
    declarations: [],
    rootType: null,
    fileIdentifier: null,
    fileExtension: null,
  };
}
