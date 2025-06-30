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
        const getRootAs = `${fbsNodeName}.getRootAs${schemaName}`;
        const nodeFactory = `(tx, fbb, ac) => new ${nodeName}(tx, fbb, ac)`;

        return `    this.${collectionName} = new ${collectionClassName}(this.tx, '${schemaName}', ${nodeFactory}, ${getRootAs}, this.authContext);`;
      })
      .join("\n");

    const transactionClassName = `ZgTransactionWithCollections<TActor>`;

    return `
export class ${transactionClassName} extends ZgTransaction {
${collectionProperties}

  constructor(
    db: ZgDatabase,
    tree: ProllyTree,
    private authContext: ZgAuthContext<TActor> | null,
  ) {
    super(db, tree);
${constructorAssignments}
  }
}

export class ZgClient<TActor> {
  private db: ZgDatabase;
  private tx: ${transactionClassName};

  private constructor(
    db: ZgDatabase,
    tx: ${transactionClassName},
  ) {
    this.db = db;
    this.tx = tx;
  }

  public static async create<TActor>(options?: any): Promise<ZgClient<TActor>> {
    const transactionFactory = (db: ZgDatabase, tree: ProllyTree) => {
      // TODO: Make auth context real
      return new ${transactionClassName}(db, tree, null);
    }
    const db = new ZgDatabase(options, transactionFactory);
    const tx = await db.createTransaction() as ${transactionClassName};
    return new ZgClient(db, tx);
  }

  public async commit(): Promise<void> {
    await this.tx.commit();
  }

  ${schemas
    .filter((s) => !s.isJoinTable)
    .map((s) => {
      const schemaName = s.name;
      const collectionName =
        schemaName.charAt(0).toLowerCase() + schemaName.slice(1) + "s";
      const collectionClassName = `${schemaName}Collection<TActor>`;
      return `
  public get ${collectionName}(): ${collectionClassName} {
    return this.tx.${collectionName};
  }`;
    })
    .join("")}
}

export async function createDB<TActor = any>(options?: any): Promise<ZgClient<TActor>> {
  return ZgClient.create<TActor>(options);
}
`;
  }
}
