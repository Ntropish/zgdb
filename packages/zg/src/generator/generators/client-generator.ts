import { IGenerator } from "./interface.js";
import { NormalizedSchema } from "../../parser/types.js";

export class ClientGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const collections = schemas
      .filter((s) => !s.isJoinTable)
      .map((s) => {
        const schemaName = s.name;
        const collectionName =
          schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + "s";
        const collectionClassName = `${schemaName}Collection<TActor>`;
        return `  public readonly ${collectionName}: ${collectionClassName};`;
      })
      .join("\n");

    const constructorAssignments = schemas
      .filter((s) => !s.isJoinTable)
      .map((s) => {
        const schemaName = s.name;
        const collectionName =
          schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + "s";
        const collectionClassName = `${schemaName}Collection<TActor>`;
        return `    this.${collectionName} = new ${collectionClassName}(this, this.authContext);`;
      })
      .join("\n");

    return `export class ZgClient<TActor> extends ZgDatabase {
${collections}
  constructor(
    prollyTree: ProllyTree,
    config: ZgConfig<TActor> = { entityResolvers: {}, globalResolvers: {} },
    authContext: ZgAuthContext<TActor> | null = null,
  ) {
    super(prollyTree, config, authContext);
${constructorAssignments}
  }

  public with<TActor>(actor: TActor): ZgClient<TActor> {
    return new ZgClient<TActor>(this.prollyTree, this.config, { actor });
  }
}`;
  }
}
