import { describe, it, expect, vi, afterEach } from "vitest";
import { parseArgs } from "./index.js";

// Mock process.exit to prevent tests from terminating
const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never);
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

describe("CLI Argument Parser", () => {
  // Restore mocks after each test
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should correctly parse --schemas and --output arguments", async () => {
    const argv = [
      "--schemas",
      "./src/schema.ts",
      "--output",
      "./src/generated",
    ];
    const result = await parseArgs(argv);
    expect(result.schemas).toBe("./src/schema.ts");
    expect(result.output).toBe("./src/generated");
  });

  it("should correctly parse aliases -s and -o", async () => {
    const argv = ["-s", "./src/schema.ts", "-o", "./src/generated"];
    const result = await parseArgs(argv);
    expect(result.schemas).toBe("./src/schema.ts");
    expect(result.output).toBe("./src/generated");
  });

  it("should show help and exit when --help is used", async () => {
    const argv = ["--help"];
    parseArgs(argv);
    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockConsoleLog).toHaveBeenCalled();
  });

  it("should show an error and exit if --schemas is missing", async () => {
    const argv = ["--output", "./src/generated"];
    parseArgs(argv);
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Missing required argument: schemas")
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should show an error and exit if --output is missing", async () => {
    const argv = ["--schemas", "./src/schema.ts"];
    parseArgs(argv);
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("Missing required argument: output")
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});

// --- Schema Discovery Tests ---
// We need to test the logic inside `main`, so we'll export it for testing.
// In the real CLI, it's just called at the end of the file.
import { main_for_testing as main } from "./index.js";
import { ZodObject, z } from "zod";

vi.mock("path", () => ({
  default: {
    resolve: (...args: string[]) => args.join("/"),
  },
}));

describe("CLI Schema Discovery", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should discover and process valid Zod schemas from a module", async () => {
    // Arrange
    const mockSchemaModule = {
      User: z.object({ name: z.string() }),
      Post: z.object({ title: z.string() }),
      someOtherExport: () => "hello",
      aNumber: 42,
    };
    vi.doMock("/my/app/src/schema.ts", () => mockSchemaModule);

    const mockRun = vi.fn();
    vi.doMock("@tsmk/zg", () => ({ run: mockRun }));

    const argv = ["-s", "/my/app/src/schema.ts", "-o", "./dist"];
    vi.spyOn(process, "argv", "get").mockReturnValue(["node", "zg", ...argv]);

    // Act
    await main();

    // Assert
    expect(mockRun).toHaveBeenCalledOnce();
    const schemasArg = mockRun.mock.calls[0][0];
    expect(schemasArg).toHaveLength(2);
    expect(schemasArg[0].name).toBe("User");
    expect(schemasArg[1].name).toBe("Post");
  });

  it("should exit with an error if no schemas are found", async () => {
    // Arrange
    const mockSchemaModule = {
      someOtherExport: () => "hello",
      aNumber: 42,
    };
    vi.doMock("/my/app/src/schema.ts", () => mockSchemaModule);

    const argv = ["-s", "/my/app/src/schema.ts", "-o", "./dist"];
    vi.spyOn(process, "argv", "get").mockReturnValue(["node", "zg", ...argv]);

    // Act
    await main();

    // Assert
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining("No Zod schemas found")
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
