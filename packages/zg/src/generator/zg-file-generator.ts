import { IGenerator } from "./generators/interface.js";
import { ImportGenerator } from "./generators/import-generator.js";
import { InterfaceGenerator } from "./generators/interface-generator.js";
import { CreateInputTypeGenerator } from "./generators/create-input-type-generator.js";
import { NodeClassGenerator } from "./generators/node-class-generator.js";
import { ClientGenerator } from "./generators/client-generator.js";
import { NormalizedSchema } from "../parser/types.js";

const LICENSE_HEADER = `// @generated
// Automatically generated. Don't change this file manually.
// Name: schema.ts
`;

export class ZgFileGenerator implements IGenerator {
  private generators: IGenerator[];

  constructor() {
    this.generators = [
      new ImportGenerator(),
      new InterfaceGenerator(),
      new CreateInputTypeGenerator(),
      new NodeClassGenerator(),
      new ClientGenerator(),
    ];
  }

  generate(schemas: NormalizedSchema[], fbsContent?: string): string {
    const parts = [LICENSE_HEADER];

    for (const generator of this.generators) {
      parts.push(generator.generate(schemas));
    }

    return parts.join("\n\n");
  }
}
