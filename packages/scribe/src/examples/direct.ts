import { createScribeTransport } from "../scribe";

async function main() {
  const transport = createScribeTransport();

  const infoLog = JSON.stringify({
    level: "info",
    time: Date.now(),
    message: "Direct info message",
  });
  await transport.send(infoLog);

  const warnLog = JSON.stringify({
    level: "warn",
    time: Date.now(),
    message: "Direct warn message",
  });
  await transport.send(warnLog);
}

main();
