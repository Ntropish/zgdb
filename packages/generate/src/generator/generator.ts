import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ZgFileGenerator } from "./zg-file-generator.js";
import {
  createFbsBuilder,
  renderFbs,
  createInitialFbsFileState,
} from "@zgdb/fbs-builder";
import { NormalizedSchema } from "../parser/types.js";
import { topologicalSort } from "./topological-sort.js";
import { GeneratorConfig } from "./types.js";
import { toSnakeCase } from "./utils.js";

const execAsync = promisify(exec);

/**
 * The main generator function that transforms a complete IR into a single
 * string representing a .fbs file.
 * @param schemas - An array of all normalized schemas, including nested ones.
 * @returns The content of the .fbs file as a string.
 */
export async function generateFbsFile(
  schemas: NormalizedSchema[]
): Promise<string> {
  const builder = createFbsBuilder();

  // A real implementation might pull this from a global config
  builder.namespace("Schema");

  const sortedSchemas = topologicalSort(schemas);

  // Set the root type to the first non-join-table schema
  const rootSchema = sortedSchemas.find((s) => !s.isJoinTable);
  if (rootSchema) {
    builder.root_type(rootSchema.name);
  }

  for (const schema of sortedSchemas) {
    // We don't generate fbs for tables that are purely for joins
    if (schema.isJoinTable) {
      continue;
    }
    const tableBuilder = builder.table(schema.name);

    if (schema.description) {
      tableBuilder.docs(schema.description);
    }

    for (const field of schema.fields) {
      tableBuilder.field(toSnakeCase(field.name), field.type as any);
    }

    if (schema.manyToMany && schema.manyToMany.length > 0) {
      for (const rel of schema.manyToMany) {
        tableBuilder.docs(
          `Many-to-many relationship: '${rel.name}' to node '${rel.node}' through '${rel.through}'`
        );
      }
    }
  }

  const initialState = createInitialFbsFileState();
  const finalState = await builder.build(initialState);
  return renderFbs(finalState);
}

export async function generate(config: GeneratorConfig) {
  const { schemas, outputDirectory, options = {} } = config;
  // Ensure the output directory exists
  await fs.mkdir(outputDirectory, { recursive: true });

  // --- Step 1: Generate the FlatBuffers schema (.fbs) file ---
  const fbsContent = await generateFbsFile(schemas);
  const fbsFilePath = path.join(outputDirectory, "schema.fbs");
  await fs.writeFile(fbsFilePath, fbsContent);
  console.log(`Generated FlatBuffers schema at ${fbsFilePath}`);

  // --- Step 2: Compile the .fbs file to TypeScript using flatc ---
  // The output of this will be `schema_generated.ts` in the output directory.
  const flatcPath = "flatc"; // Assumes flatc is in the system's PATH
  const command = `${flatcPath} --ts --gen-mutable --gen-all -o ${outputDirectory} ${fbsFilePath}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stderr && !stderr.includes("binary schema")) {
      // flatc often outputs benign warnings to stderr about binary schema files not being generated
      // so we will ignore those.
      console.error(`flatc error: ${stderr}`);
    }
    console.log(`Successfully compiled FlatBuffers schema with flatc`);
    if (stdout) {
      console.log(stdout);
    }
  } catch (error) {
    console.error(`Failed to execute flatc: ${error}`);
    // Decide if we should stop here or continue
  }

  // --- Step 3: Generate the ZG schema file ---
  const fileGenerator = new ZgFileGenerator();
  const tsContent = fileGenerator.generate(schemas);
  const tsFilePath = path.join(outputDirectory, "schema.ts");
  await fs.writeFile(tsFilePath, tsContent);
  console.log(`Generated ZG schema at ${tsFilePath}`);
}
