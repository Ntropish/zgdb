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
}

/**
 * Represents the raw, user-defined schema file format.
 * This is the input to our `parser` stage.
 */
export interface RawSchema {
  name: string;
  description?: string;
  schema: z.ZodObject<any>;
  relationships?: {
    [nodeName: string]: {
      // e.g., 'User', 'Post', or 'polymorphic', or 'many-to-many'
      [relationshipName: string]: any;
    };
  };
  indexes?: Index[];
}
