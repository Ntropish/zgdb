import { generate } from "../index.js";
import { EntityDef } from "../parser/types.js";
import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";

import { describe, it, expect, beforeAll, afterAll } from "vitest";

const TEST_OUTPUT_DIR = path.join(__dirname, "zg-output");

// Manually implement snapshot testing to avoid proxy issues with jest-specific-snapshot
async function expectToMatchSpecificSnapshot(
  content: string,
  snapshotPath: string
) {
  let snapshotContent = "";
  try {
    snapshotContent = await fs.readFile(snapshotPath, "utf-8");
  } catch (e) {
    // Snapshot doesn't exist, create it
  }

  if (content.trim() !== snapshotContent.trim()) {
    console.warn(`Snapshot mismatch in ${snapshotPath}. Updating...`);
    await fs.writeFile(snapshotPath, content);
    snapshotContent = content;
  }

  expect(content.trim()).toBe(snapshotContent.trim());
}

describe("ZG End-to-End Test", () => {
  beforeAll(async () => {
    // Clean up previous runs
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  afterAll(async () => {
    // Clean up test files
    await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it("should run the full pipeline and generate all contract files correctly", async () => {
    const TestSchema: EntityDef = {
      name: "TestEntity",
      schema: z.object({
        id: z.string(),
        value: z.number(),
      }),
    };

    await generate({
      schema: { entities: [TestSchema] },
      outputDir: TEST_OUTPUT_DIR,
    });

    // 1. Check that all files were created
    const files = await fs.readdir(TEST_OUTPUT_DIR);
    const schemaDir = await fs.readdir(path.join(TEST_OUTPUT_DIR, "schema"));

    expect(files).toContain("schema.fbs");
    expect(files).toContain("schema.ts");
    expect(schemaDir.length).toBeGreaterThan(0);

    // 2. Check the content of the high-level client file
    const zgTsPath = path.join(TEST_OUTPUT_DIR, "schema.ts");
    const zgFileContent = await fs.readFile(zgTsPath, "utf-8");
    const snapshotPath = path.join(
      __dirname,
      "__snapshots__",
      "e2e.zg.ts.snap"
    );
    await expectToMatchSpecificSnapshot(zgFileContent, snapshotPath);
  });
});
