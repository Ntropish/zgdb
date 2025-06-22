import { createTuiApp } from "../../component.js";
import { App } from "./app.js";
import { VNode } from "@tsmk/kernel";

async function main() {
  const vnode: VNode = {
    factory: App,
    props: {},
  };
  createTuiApp(vnode);
}

main().catch(console.error);
