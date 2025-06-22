import { tint } from "../index";

async function main() {
  const hello = await tint().red("Hello");
  const world = await tint().green.bold("World");
  console.log(`${hello} ${world}!`);
}

main();
