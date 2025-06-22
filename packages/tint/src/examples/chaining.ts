import { tint } from "../index";

async function main() {
  const t = tint();

  const welcome = await t.bold.underline("Welcome to TSMK Tint!");
  const primary = await t.cyan("This is a primary message.");
  const warning = await t.yellow.italic("This is a warning.");
  const error = await t.red.bold.inverse("This is an error!");

  console.log(welcome);
  console.log();
  console.log(primary);
  console.log(warning);
  console.log(error);
}

main();
