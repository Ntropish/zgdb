import { IGenerator } from "./interface.js";
import { NormalizedSchema } from "../../parser/types.js";

export class ClientGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const collectionProperties = schemas
      .filter((s) => !s.isJoinTable && !s.isNested)
      .map((s) => {
        const schemaName = s.name;
        const collectionName =
          schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + "s";
        const collectionClassName = `${schemaName}Collection<TActor>`;
        return `  public readonly ${collectionName}: ${collectionClassName};`;
      })
      .join("\n");

    const constructorAssignments = schemas
      .filter((s) => !s.isJoinTable && !s.isNested)
      .map((s) => {
        const schemaName = s.name;
        const collectionName =
          schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + "s";
        const collectionClassName = `${schemaName}Collection<TActor>`;
        const nodeName = `${schemaName}Node<TActor>`;
        const fbsNodeName = `${schemaName}FB.${schemaName}`;
        const getRootAs = `(bb) => ${fbsNodeName}.getRootAs${schemaName}(bb)`;
        const nodeFactory = `(tx, fbb: ${fbsNodeName}, ac) => new ${nodeName}(tx as ZgTransactionWithCollections<TActor>, fbb, ac)`;

        return `    this.${collectionName} = new ${collectionClassName}(this, '${schemaName}', ${nodeFactory}, ${getRootAs}, this.authContext);`;
      })
      .join("\n");

    const transactionClassName = `ZgTransactionWithCollections<TActor>`;

    return `
export class ${transactionClassName} extends ZgTransaction {
${collectionProperties}

  constructor(
    db: ZgDatabase,
    tree: any,
    authContext: ZgAuthContext<TActor> | null,
    config: ZgDbConfiguration,
  ) {
    super(db, tree, authContext, config);
${constructorAssignments}
  }
}

export const DB = {
  Transaction: ZgTransactionWithCollections,
};
`;
  }
}
