export interface FbsField {
  name: string;
  type: string;
}

export type FbsAuthRule = {
  type: "policy" | "capability";
  value: string;
};

export interface FbsTableState {
  name: string;
  docs: string[];
  fields: FbsField[];
  authRules: Map<string, FbsAuthRule[]>;
}

export interface FbsFileState {
  tables: Map<string, FbsTableState>;
  rootType: string | null;
}
