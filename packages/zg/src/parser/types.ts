/**
 * This file defines the Intermediate Representation (IR) for our schema,
 * as well as the shape of the raw, user-defined schema files.
 */

import { z } from "zod";

// --- User-Facing Types ---

export type IndexDef = {
  on: string | string[];
  type?: "btree" | "hash" | "fulltext";
  unique?: boolean;
  description?: string;
};

export type PolymorphicRelationshipDef = {
  type: "polymorphic";
  cardinality: "one" | "many";
  required?: boolean;
  description?: string;
  discriminator: string; // e.g., 'targetType'
  foreignKey: string; // e.g., 'targetId'
  references: string[]; // e.g., ['Post', 'Comment']
};

export type StandardRelationshipDef = {
  type: "standard";
  entity: string;
  field?: string;
  cardinality: "one" | "many";
  required?: boolean;
  description?: string;
  mappedBy?: string;
};

export type RelationshipDef =
  | StandardRelationshipDef
  | PolymorphicRelationshipDef;

export type ManyToManyDef = {
  node: string;
  through: string;
  myKey: string;
  theirKey: string;
  description?: string;
};

export type EntityDef = {
  name: string;
  description?: string;
  schema: z.ZodObject<any>;
  relationships?: Record<string, RelationshipDef>;
  manyToMany?: Record<string, ManyToManyDef>;
  indexes?: IndexDef[];
  resolvers?: Record<string, Resolver<any>>;
};

export type ResolverContext<TClient = any, TActor = any> = {
  actor: TActor;
  db: TClient;
  input?: Record<string, any>;
  record?: Record<string, any>;
};

export type Resolver<TClient = any, TActor = any> = (
  context: ResolverContext<TClient, TActor>
) => Promise<boolean> | boolean;

export type Policy<TClient = any, TActor = any> = Resolver<TClient, TActor>;

export type InferredResolvers<
  TClient,
  TActor,
  TEntities extends Record<string, EntityDef>
> = {
  [K in keyof TEntities]?: Record<string, Resolver<TClient, TActor>>;
};

export type AuthBlock = {
  create?: string | string[];
  read?: string | string[];
  update?: string | string[];
  delete?: string | string[];
};

export type SchemaConfig<
  TClient = any,
  TActor = any,
  TEntities extends Record<string, EntityDef> = any,
  TGlobalResolvers extends Record<string, Resolver<TClient, TActor>> = any,
  TResolvers extends InferredResolvers<TClient, TActor, TEntities> = any
> = {
  entities: TEntities;
  globalResolvers?: TGlobalResolvers;
  resolvers?: TResolvers;
  auth?: {
    [entityName: string]: AuthBlock;
  };
};

// --- Internal, Normalized Types ---

export type Field = {
  name: string;
  type: string;
  attributes: Map<string, string | boolean>;
  description?: string;
  isVector?: boolean;
  required: boolean;
};

export type Index = {
  name: string;
  on: string[];
  unique?: boolean;
  type: "btree" | "hash" | "fulltext";
};

export type Relationship = {
  name: string;
  node: string;
  cardinality: "one" | "many";
  required?: boolean;
  description?: string;
  mappedBy?: string;
};

export type ManyToManyRelationship = {
  name: string;
  node: string;
  through: string;
  myKey: string;
  theirKey: string;
  description?: string;
};

export type PolymorphicRelationship = {
  type: "polymorphic";
  field: string;
};

export type NormalizedSchema = {
  name: string;
  description?: string;
  fields: Field[];
  isJoinTable?: boolean;
  indexes: Index[];
  auth?: AuthBlock;
  localResolvers?: Record<string, Function>;
  globalResolvers?: Record<string, Function>;
  relationships: (Relationship | PolymorphicRelationship)[];
  manyToMany: ManyToManyRelationship[];
};
