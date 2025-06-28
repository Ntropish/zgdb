/**
 * This file defines the Intermediate Representation (IR) for our schema,
 * as well as the shape of the raw, user-defined schema files.
 */

import { z } from "zod";

/**
 * The flexible context object passed to every resolver.
 */
export interface ResolverContext<
  TActor,
  TClient,
  TInput,
  TNode = any,
  TContext = {}
> {
  actor: TActor;
  record?: TNode;
  input?: Partial<TInput>;
  context?: TContext;
  db: TClient;
}

/** A generic, permissive resolver function type for the developer-facing interface. */
export type Resolver<TArgs = {}, TReturn = any> = (
  context: ResolverContext<any, any, any, any, TArgs>
) => TReturn;

/** A specialized resolver type for authorization policies, which must return a boolean. */
export type Policy<TArgs = {}> = Resolver<TArgs, boolean | Promise<boolean>>;

/** Defines the structure for a single database index. */
export interface Index {
  on: string | string[];
  unique?: boolean;
  type?: "btree" | "hash" | "fulltext";
  description?: string;
}

/** Defines a standard, direct relationship between two nodes. */
export interface Relationship {
  name: string;
  node: string;
  cardinality: "one" | "many";
  required?: boolean;
  description?: string;
  mappedBy?: string;
  targetField?: string;
}

/** Defines a polymorphic relationship. */
export interface PolymorphicRelationship extends Relationship {
  type: "polymorphic";
  discriminator: string;
  foreignKey: string;
  references: string[];
}

/** Defines a many-to-many relationship, facilitated by a join entity. */
export interface ManyToManyRelationship {
  name: string;
  node: string;
  through: string;
  myKey: string;
  theirKey: string;
  description?: string;
}

/** Represents a single field within a schema's data structure. */
export interface Field {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

/** An authorization rule can be a single policy string or a list of policy strings (checked with OR logic). */
export type AuthRule = number | number[];

/** The set of actions that can be controlled on an entity or field. */
export type AuthAction = "create" | "read" | "update" | "delete";

/** The set of actions that can be controlled on a relationship. */
export type RelationshipAction = "read" | "add" | "remove";

/** Defines the authorization rules for a ZG entity. */
export interface AuthBlock<TRule> {
  create?: TRule;
  read?: TRule;
  update?: TRule;
  delete?: TRule;
  fields?: {
    [fieldName: string]: {
      [key in AuthAction | RelationshipAction]?: TRule;
    };
  };
  relationships?: {
    [relationshipName: string]: {
      [key in RelationshipAction]?: TRule;
    };
  };
}
export type NormalizedAuthBlock = AuthBlock<number | number[]>;
export type ZGAuthBlock<TAuthPolicy> = AuthBlock<TAuthPolicy | TAuthPolicy[]>;

/**
 * The developer-facing definition for a single entity.
 */
export interface EntityDef<
  TResolvers extends Record<string, Resolver<any, any>>,
  TGlobalPolicies extends Record<string, Policy<any>>
> {
  name: string;
  description?: string;
  schema: z.ZodObject<any>;
  relationships?: any;
  indexes?: any;
  auth?: AuthBlock<
    | keyof TResolvers
    | keyof TGlobalPolicies
    | (keyof TResolvers | keyof TGlobalPolicies)[]
  >;
  manyToMany?: any;
  resolvers?: TResolvers;
}

/**
 * The internal, normalized representation of a schema.
 */
export interface NormalizedSchema {
  name: string;
  description?: string;
  fields: Field[];
  relationships: (Relationship | PolymorphicRelationship)[];
  manyToMany: ManyToManyRelationship[];
  indexes?: Index[];
  auth: NormalizedAuthBlock;
  policies?: string[];
  localResolvers?: Record<string, Function>;
  globalResolvers?: Record<string, Function>;
}

/** A helper type that infers the shape of the `resolvers` object. */
export type InferredResolvers<
  TActor,
  TClient,
  TEntities extends Record<string, EntityDef<any, any>>
> = {
  [K in keyof TEntities]?: {
    [key: string]: (
      context: ResolverContext<TActor, TClient, z.infer<TEntities[K]["schema"]>>
    ) => any;
  };
};

/**
 * The configuration object for the main `createSchema` factory.
 */
export interface SchemaConfig<
  TActor,
  TClient,
  TEntities extends Record<string, EntityDef<any, any>>,
  TGlobalResolvers extends Record<string, Function>
> {
  globalResolvers?: TGlobalResolvers;
  entities: TEntities;
  resolvers?: InferredResolvers<TActor, TClient, TEntities>;
}
