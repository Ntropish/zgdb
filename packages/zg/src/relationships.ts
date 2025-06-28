import {
  StandardRelationshipDef,
  PolymorphicRelationshipDef,
} from "./parser/types.js";

type RelationshipOptions = Omit<
  StandardRelationshipDef,
  "type" | "entity" | "cardinality"
>;
type PolymorphicRelationshipOptions = Omit<
  PolymorphicRelationshipDef,
  "type" | "references" | "cardinality"
>;

function one(
  entity: string,
  options?: RelationshipOptions
): StandardRelationshipDef {
  return {
    type: "standard",
    cardinality: "one",
    entity,
    ...options,
  };
}

function many(
  entity: string,
  options?: RelationshipOptions
): StandardRelationshipDef {
  return {
    type: "standard",
    cardinality: "many",
    entity,
    ...options,
  };
}

function polymorphic(
  references: string[],
  options: PolymorphicRelationshipOptions & { cardinality?: "one" | "many" }
): PolymorphicRelationshipDef {
  return {
    type: "polymorphic",
    references,
    ...options,
    cardinality: options?.cardinality ?? "one",
  };
}

export const r = {
  one,
  many,
  polymorphic,
};
