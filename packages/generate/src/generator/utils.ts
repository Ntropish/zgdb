/**
 * Maps a FlatBuffers schema type to a corresponding TypeScript type.
 * @param fbsType - The FlatBuffers type (e.g., 'string', 'long').
 * @returns The TypeScript type as a string.
 */
export function mapTsType(fbsType: string): string {
  const typeMap: Record<string, string> = {
    string: "string",
    long: "bigint",
    bool: "boolean",
  };
  // For nested objects or unhandled types, we can default to 'any'
  // or handle more complex mappings here in the future.
  return typeMap[fbsType] || "any";
}

export const toKebabCase = (str: string) =>
  str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();

export const toSnakeCase = (str: string) =>
  str
    .replace(/([A-Z])/g, "_$1")
    .replace(/^_/, "")
    .toLowerCase();
