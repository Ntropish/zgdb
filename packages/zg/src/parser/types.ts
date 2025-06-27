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
export type AuthRule<TAuthPolicy extends string> = TAuthPolicy | TAuthPolicy[];

/** The set of actions that can be controlled on an entity or field. */
export type AuthAction = "create" | "read" | "update" | "delete";

/** The set of actions that can be controlled on a relationship. */
export type RelationshipAction = "read" | "add" | "remove";

/** Defines the authorization rules for a ZG entity. */
export interface AuthBlock<TAuthPolicy extends string> {
  // --- Root-level rules ---
  create?: AuthRule<TAuthPolicy>;
  read?: AuthRule<TAuthPolicy>;
  update?: AuthRule<TAuthPolicy>;
  delete?: AuthRule<TAuthPolicy>;

  /** Field-level authorization overrides. */
  fields?: {
    [fieldName: string]: {
      [key in AuthAction]?: AuthRule<TAuthPolicy>;
    };
  };

  /** Relationship-level authorization. */
  relationships?: {
    [relationshipName: string]: {
      [key in RelationshipAction]?: AuthRule<TAuthPolicy>;
    };
  };
}

/**
 * The normalized, generator-friendly representation of a single schema entity.
 * This is the core object of our Intermediate Representation.
 */
export interface NormalizedSchema<TAuthPolicy extends string = string> {
  name: string;
  description?: string;
  fields: Field[];
  relationships: (Relationship | PolymorphicRelationship)[];
  manyToMany: ManyToManyRelationship[];
  indexes?: Index[];
  auth: AuthBlock<TAuthPolicy>;
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
  auth?: AuthBlock<TAuthPolicy>;
  manyToMany?: any;
}

/**
 * @deprecated Use ZGEntityDef instead.
 * Represents the raw, user-defined schema file format.
 * This is the input to our `parser` stage.
 */
export type RawSchema = ZGEntityDef<any, any>;
