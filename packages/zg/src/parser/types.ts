/**
 * This file defines the Intermediate Representation (IR) for our schema,
 * as well as the shape of the raw, user-defined schema files.
 */

import { z } from "zod";

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
  name: string; // e.g., 'tags', 'followers'
  node: string; // e.g., 'Tag', 'User'
  through: string; // e.g., 'PostTag', 'Follow'
  myKey: string; // e.g., 'postId', 'followerId'
  theirKey: string; // e.g., 'tagId', 'followingId'
  description?: string;
}

/** Represents a single field within a schema's data structure. */
export interface Field {
  name: string;
  type: string; // e.g., 'string', 'number', 'date'
  required: boolean;
  description?: string;
}

/** An authorization rule can be a single policy string or a list of policy strings (checked with OR logic). */
export type AuthRule = number | number[];
export type NormalizedAuthBlock = AuthBlock<number | number[]>;

/** The set of actions that can be controlled on an entity or field. */
export type AuthAction = "create" | "read" | "update" | "delete";

/** The set of actions that can be controlled on a relationship. */
export type RelationshipAction = "read" | "add" | "remove";

/** Defines the authorization rules for a ZG entity. */
export interface AuthBlock<TRule> {
  // --- Root-level rules ---
  create?: TRule;
  read?: TRule;
  update?: TRule;
  delete?: TRule;

  /** Field-level authorization overrides. */
  fields?: {
    [fieldName: string]: {
      [key in AuthAction]?: TRule;
    };
  };

  /** Relationship-level authorization. */
  relationships?: {
    [relationshipName: string]: {
      [key in RelationshipAction]?: TRule;
    };
  };
}

/**
 * The normalized, generator-friendly representation of a single schema entity.
 * This is the core object of our Intermediate Representation.
 */
export interface NormalizedSchema {
  name: string;
  description?: string;
  fields: Field[];
  relationships: (Relationship | PolymorphicRelationship)[];
  manyToMany: ManyToManyRelationship[];
  indexes?: Index[];
  auth: NormalizedAuthBlock;
  policies?: string[]; // The canonical list of ALL policies
}

/**
 * Represents the raw, user-defined schema file format.
 * This is the input to our `parser` stage.
 */
export interface ZGEntityDef<
  T extends z.ZodRawShape,
  TAuthPolicy extends string = string
> {
  name: string;
  description?: string;
  schema: z.ZodObject<T>;
  relationships?: {
    [nodeName: string]: {
      [relationshipName: string]: any;
    };
  };
  indexes?: Index[];
  auth?: AuthBlock<TAuthPolicy | TAuthPolicy[]>;
  manyToMany?: any;
}

/**
 * @deprecated Use ZGEntityDef instead.
 * Represents the raw, user-defined schema file format.
 * This is the input to our `parser` stage.
 */
export type RawSchema = ZGEntityDef<any, any>;

export type { AuthBlock as ZGAuthBlock } from "./types.js";

/**
 * The definition for a single entity, including its local policies and default resolvers.
 */
export interface EntityDef<TActor> {
  name: string;
  description?: string;
  policies?: readonly string[];
  defaultResolvers?: Record<
    string,
    (context: AuthContext<TActor, any>) => boolean | Promise<boolean>
  >;
  schema: z.ZodObject<any>;
  relationships?: any;
  indexes?: any;
  auth?: AuthBlock<string | string[]>;
  manyToMany?: any;
}

/**
 * The configuration object for the main `createSchema` factory.
 */
export interface SchemaConfig<
  TActor,
  TEntities extends Record<string, EntityDef<TActor>>
> {
  policies?: Record<
    string,
    (context: AuthContext<TActor, any>) => boolean | Promise<boolean>
  >;
  entities: TEntities;
}

/**
 * The flexible context object passed to every resolver.
 */
export interface AuthContext<TActor, TRecord> {
  actor: TActor;
  record?: TRecord;
  input?: Partial<TRecord>;
}
