import { IGenerator } from "./interface.js";
import { NormalizedSchema } from "../../parser/types.js";

export class ClientGenerator implements IGenerator {
  generate(schemas: NormalizedSchema[]): string {
    const collectionProperties = schemas
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
        const fbsNodeName = `${schemaName}FB.${schemaName}`;
        const nodeName = `${schemaName}Node<TActor>`;
        const getRootAs = `(bb) => ${fbsNodeName}.getRootAs${schemaName}(bb)`;
        const nodeFactory = `(tx, fbb, ac) => new ${nodeName}(tx, fbb, ac)`;

        return `    this.${collectionName} = new ${collectionClassName}(this, '${schemaName}', ${nodeFactory}, ${getRootAs}, this.authContext);`;
      })
      .join("\n");

    const transactionClassName = `ZgTransactionWithCollections<TActor>`;

    return `
export class ${transactionClassName} extends ZgTransaction {
${collectionProperties}

  constructor(
    db: ZgDatabase,
    tree: ProllyTree,
    authContext: ZgAuthContext<TActor> | null,
  ) {
    super(db, tree, authContext);
${constructorAssignments}
  }
}

export class ZgClient<TActor> {
  private db: ZgDatabase;

  private constructor(db: ZgDatabase) {
    this.db = db;
  }

  public static async create<TActor>(options?: any): Promise<ZgClient<TActor>> {
    const transactionFactory = (
      db: ZgDatabase,
      tree: ProllyTree,
      authContext: ZgAuthContext<TActor> | null
    ) => {
      return new ${transactionClassName}(db, tree, authContext);
    };
    const db = new ZgDatabase(options, transactionFactory);
    return new ZgClient(db);
  }

  public async createTransaction(options: {
    actor: TActor;
  }): Promise<${transactionClassName}> {
    return (await this.db.createTransaction({
      actor: options.actor,
    })) as ${transactionClassName};
  }
}

export async function createDB<TActor = any>(options?: any): Promise<ZgClient<TActor>> {
  return ZgClient.create<TActor>(options);
}
`;
  }
}
