/**
 * Defines the complete set of authorization policies available in this application.
 * This union type is used as a generic parameter in `ZGEntityDef` to provide
 * strict type-checking for all authorization hooks in the schema definitions.
 */
export type AppAuthPolicy =
  // General
  | "isPublic"
  | "isAuthenticated"
  | "never"
  // User-specific
  | "isSelf"
  | "isCreatingSelf"
  // Ownership-based
  | "isOwner"
  | "isAuthor"
  | "isFollower"
  | "isPostAuthor"
  // Role-based
  | "hasAdminRights";
