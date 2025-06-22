import { appendFileSync } from "fs";
import { inspect } from "util";

const LOG_FILE = "debug.log";

export function log(...args: any[]) {
  const message = args
    .map((arg) => inspect(arg, { depth: null, colors: false }))
    .join(" ");
  appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${message}\n`);
}
