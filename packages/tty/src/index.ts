import { Reactor } from "@tsmk/kernel";
import { parseKey, parseSgrMouse } from "./parser.js";
import { Key, Mouse, TtyEventMap } from "./types.js";

export type { Key, Mouse, TtyEventMap };

export function createTtyReactor(eventMap: Reactor.EventMap<TtyEventMap>): {
  reactor: Reactor.Kernel<TtyEventMap>;
  stop: () => void;
} {
  const ttyReactor = Reactor.create<TtyEventMap>({ eventMap });
  let buffer = "";
  let timeout: NodeJS.Timeout | null = null;

  process.stdin.setRawMode(true);
  process.stdin.setEncoding("utf8");
  process.stdin.resume();

  const processBuffer = () => {
    if (buffer.length > 0) {
      const key = parseKey(buffer);
      if (key) {
        ttyReactor.trigger("key", key);
      }
      buffer = "";
    }
  };

  const onData = (data: Buffer) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    buffer += data.toString();

    if (parseKey(buffer)) {
      processBuffer();
    } else {
      timeout = setTimeout(processBuffer, 10);
    }
  };

  const onResize = () => {
    ttyReactor.trigger("resize", {
      width: process.stdout.columns,
      height: process.stdout.rows,
    });
  };

  process.stdin.on("data", onData);
  process.stdout.on("resize", onResize);

  // Take control of the terminal
  // 1. Set cursor to normal mode (not application mode)
  // 2. Hide the cursor
  // 3. Disable line wrapping
  // 4. Enable Mouse and Focus tracking
  process.stdout.write(
    "\u001b[?1l\u001b[?25l\u001b[?7l\u001b[?1000h\u001b[?1003h\u001b[?1006h\u001b[?1004h"
  );

  // Cleanup function
  const stop = () => {
    process.stdin.setRawMode(false);
    process.stdin.removeListener("data", onData);
    process.stdout.removeListener("resize", onResize);
    process.stdin.pause();
    process.stdin.end();
    // Restore terminal state
    // 1. Set cursor to application mode
    // 2. Show the cursor
    // 3. Enable line wrapping
    // 4. Disable Mouse and Focus tracking
    process.stdout.write(
      "\u001b[?1h\u001b[?25h\u001b[?7h\u001b[?1000l\u001b[?1003l\u001b[?1006l\u001b[?1004l"
    );
  };

  return { reactor: ttyReactor, stop };
}
