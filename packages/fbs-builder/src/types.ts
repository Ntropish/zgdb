export type FbsScalar =
  | "bool"
  | "byte"
  | "ubyte"
  | "short"
  | "ushort"
  | "int"
  | "uint"
  | "long"
  | "ulong"
  | "float"
  | "double";

export type FbsType = FbsScalar | string; // string for other tables, structs, etc.

export interface FbsField {
  name: string;
  type: FbsType;
  defaultValue?: number | string | boolean | null;
  isVector: boolean;
  attributes: Map<string, string | boolean>;
}

export interface FbsDeclaration {
  kind: "table" | "struct" | "enum" | "union";
  name: string;
  docs: string[];
}

export interface FbsTableState extends FbsDeclaration {
  kind: "table";
  fields: FbsField[];
  attributes: Map<string, string | boolean>;
}

export interface FbsStructState extends FbsDeclaration {
  kind: "struct";
  fields: FbsField[]; // in structs, fields cannot be optional or have defaults
}

export interface FbsEnumState extends FbsDeclaration {
  kind: "enum";
  type: FbsScalar;
  values: Map<string, number>;
}

export interface FbsUnionState extends FbsDeclaration {
  kind: "union";
  values: string[]; // table names
}

export interface FbsFileState {
  namespace: string | null;
  includes: string[];
  declarations: FbsDeclaration[];
  rootType: string | null;
  fileIdentifier: string | null;
  fileExtension: string | null;
}
