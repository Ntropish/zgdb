import { MyExample } from "./generated/index.js";
import { mount } from "./library.js";

const root = document.querySelector("#root") as HTMLElement;

if (root) {
  mount(root, MyExample({ props: { name: "John" } }));
} else {
  console.error("Root element not found");
}
