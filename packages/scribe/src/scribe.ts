import { Transport, LogRecord } from "@tsmk/log";
import { tint } from "@tsmk/tint";

async function formatLevel(level: string) {
  const t = tint().bold;
  switch (level) {
    case "info":
      return await t.cyan("INFO");
    case "warn":
      return await t.yellow("WARN");
    case "error":
      return await t.red("ERROR");
    default:
      return await t.gray(level.toUpperCase());
  }
}

async function formatData(data: any, verbose = false): Promise<string> {
  if (!data) return "";

  const { orchestratorId, stepId, contextBefore, contextAfter, ...rest } = data;

  let parts: string[] = [];

  if (verbose && orchestratorId !== undefined && stepId !== undefined) {
    const id = await tint().gray(
      `(Orchestrator: ${orchestratorId}, Step: ${stepId})`
    );
    if (id) {
      parts.push(id);
    }
  }

  const formatContext = async (ctx: any) => {
    if (!ctx) return null;
    if (ctx.req?.method && ctx.req?.url) {
      return tint().dim.gray(`[${ctx.req.method}] ${ctx.req.url}`);
    }
    return null;
  };

  const ctxBefore = await formatContext(contextBefore);
  if (ctxBefore) parts.push(ctxBefore);

  const ctxAfter = await formatContext(contextAfter);
  if (ctxAfter && !ctxBefore) parts.push(ctxAfter);

  if (verbose && Object.keys(rest).length > 0) {
    const restString = JSON.stringify(rest, null, 2);
    if (restString) {
      const tintedRest = await tint().gray(restString);
      if (tintedRest) {
        parts.push(tintedRest);
      }
    }
  }

  return parts.join(" ");
}

export class ScribeTransport implements Transport {
  private verbose: boolean;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
  }

  public async send(log: string): Promise<void> {
    try {
      const record: LogRecord = JSON.parse(log);
      const output = await this.format(record);
      console.log(output);
    } catch (e) {
      // If we can't parse the log, print it raw
      console.log(log);
    }
  }

  private async format(record: LogRecord): Promise<string> {
    const { time, level, message, data, error } = record;

    const timeStr = await tint().dim.gray(new Date(time).toISOString());
    const levelStr = await formatLevel(level);
    const messageStr = message;

    let output = `${timeStr} ${levelStr} ${messageStr}`;

    if (data) {
      const dataStr = await formatData(data, this.verbose);
      if (dataStr) {
        output += ` ${dataStr}`;
      }
    }

    if (error) {
      let errorStr: string | undefined;
      let separator = " ";

      if (this.verbose) {
        separator = "\n";
        const fullError =
          typeof error === "string" ? error : JSON.stringify(error, null, 2);
        errorStr = await tint().red(fullError);
      } else {
        const errorMessage =
          typeof error === "string"
            ? error
            : error?.message || "An unknown error occurred.";
        errorStr = await tint().red(errorMessage);
      }
      output += `${separator}${errorStr}`;
    }

    return output;
  }
}

export function createScribeTransport(
  options: { verbose?: boolean } = {}
): ScribeTransport {
  return new ScribeTransport(options);
}
