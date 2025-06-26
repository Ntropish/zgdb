import { NormalizedSchema } from "../../parser/types.js";
import { mapTsType } from "../utils.js";

/**
 * Generates a TypeScript interface definition as a string for a given schema.
 * Example:
 * export interface IUser {
 *   id: string;
 *   name: string;
 * }
 */
function generateInterface(schema: NormalizedSchema): string {
  const fields = schema.fields
    .map((field) => `  ${field.name}: ${mapTsType(field.type)};`)
    .join("\n");

  // TODO: Add relationship fields to the interface
  // const relationships = schema.relationships.map(...);

  const content = [fields].filter(Boolean).join("\n\n");

  return `export interface I${schema.name} {\n${content}\n}`;
}

/**
 * Generates TypeScript interface definitions for all provided schemas.
 * @param schemas - An array of normalized schemas.
 * @returns A string containing all the generated interface definitions.
 */
export function generateInterfaces(schemas: NormalizedSchema[]): string {
  return schemas.map(generateInterface).join("\n\n");
}
