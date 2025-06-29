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
        const nodeName = `${schemaName}Node<TActor>`;
        return `  get ${collectionName}(): EntityCollection<${nodeName}> {
    return new EntityCollection<${nodeName}>(
      this,
      '${schemaName}',
      (db, fbb, ac) => new ${nodeName}(db, fbb, ac),
      (bb) => ${schemaName}FB.${schemaName}.getRootAs${schemaName}(bb)
    );
  }`;
      })
      .join("\n\n");

    return `export class ZgClient<TActor> extends ZgDatabase {
  constructor(
    prollyTree: ProllyTree,
    config: ZgConfig<TActor> = { entityResolvers: {}, globalResolvers: {} }
  ) {
    super(prollyTree, config);
  }

${collections}
}`;
  }
}
