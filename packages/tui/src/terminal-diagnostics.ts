// packages/tui/src/terminal-diagnostics.ts

function toCharCodes(str: string): string {
  return str
    .split("")
    .map((c) => c.charCodeAt(0))
    .join(" ");
}

function main() {
  console.log("Terminal Diagnostics Tool");
  console.log("-------------------------");
  console.log("Attempting to enable mouse and focus tracking...");
  console.log(
    "The following escape codes will be sent to your terminal to enable event tracking:"
  );
  console.log("  - VT200 Mouse: \\u001b[?1000h");
  console.log("  - Any-Event Mouse: \\u001b[?1003h");
  console.log("  - SGR-Extended Mouse: \\u001b[?1006h");
  console.log("  - Focus In/Out: \\u001b[?1004h");
  console.log("-------------------------");
  console.log(
    "Please move, click your mouse, and switch focus away from and back to this window."
  );
  console.log("Press Ctrl+C to exit.");
  console.log("-------------------------");

  // Enable all modern mouse and focus tracking protocols
  const enableMouseAndFocus =
    "\u001b[?1000h\u001b[?1003h\u001b[?1006h\u001b[?1004h";
  process.stdout.write(enableMouseAndFocus);

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf-8");

  process.stdin.on("data", (data: Buffer | string) => {
    const dataStr = data.toString("utf-8");
    console.log(
      `Received: ${JSON.stringify(dataStr)} | Char Codes: [${toCharCodes(
        dataStr
      )}]`
    );
    if (dataStr === "\u0003") {
      // Ctrl+C
      console.log("-------------------------");
      console.log("Exiting. Disabling tracking.");
      const disableMouseAndFocus =
        "\u001b[?1000l\u001b[?1003l\u001b[?1006l\u001b[?1004l";
      process.stdout.write(disableMouseAndFocus);
      process.exit(0);
    }
  });

  process.on("exit", () => {
    console.log("Ensuring all tracking is disabled on exit.");
  });
}

main();
