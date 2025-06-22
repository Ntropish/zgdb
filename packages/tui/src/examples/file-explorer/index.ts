import { createTuiApp } from "../../component.js";
import { App } from "./app.js";
import { VNode } from "@tsmk/kernel";

async function main() {
  const vnode: VNode = {
    factory: App,
    props: {},
  };
  const { cleanup } = createTuiApp(vnode);

  process.on("exit", () => {
    cleanup();
  });
}

main().catch(console.error);
