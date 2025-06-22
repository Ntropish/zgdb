import { createLogger } from "@tsmk/log";
import { createScribeTransport } from "../scribe";

async function main() {
  const transport = createScribeTransport();
  const { plugins } = createLogger({ transport });

  const { info, warn, error } = plugins;

  if (info) {
    for (const log of info) {
      await log({
        message: "This is an informational message.",
        data: { user: "test", id: 123 },
      });
    }
  }

  if (warn) {
    for (const log of warn) {
      await log({ message: "This is a warning message." });
    }
  }

  if (error) {
    for (const log of error) {
      await log({
        message: "This is an error message.",
        error: new Error("Something went wrong!"),
      });
    }
  }
}

main().catch(console.error);
