#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { FeedbackLoop } from "./feedback-loop.js";
import { JsonFileStore } from "./stores/json-file.js";
import { importLegacyV1 } from "./migration.js";
import { readAll } from "./analyzer.js";
import { collections } from "./stores/in-memory.js";
const [command, ...args] = process.argv.slice(2);
function flag(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index < 0 ? undefined : args[index + 1];
}
async function main() {
  if (!command || command === "--help") {
    console.log(
      "Loopiter alpha (local JSON development tools)\n analyze --file STATE --namespace NAME --dimensions metadata.task\n candidates|events --file STATE --namespace NAME\n export --file STATE --namespace NAME (writes JSON to stdout)\n import-v1 --input OLD --file NEW --namespace NAME\n Production/starter commands: see the Fern quickstart.",
    );
    return;
  }
  const file = flag("file"),
    namespace = flag("namespace");
  if (!file || !namespace)
    throw new Error("--file and --namespace are required.");
  if (
    command === "import-v1" &&
    (!flag("input") || resolve(flag("input")!) === resolve(file))
  )
    throw new Error(
      "Use distinct --input and --file paths; original files are preserved.",
    );
  const loop = new FeedbackLoop({ store: new JsonFileStore(file), namespace });
  try {
    let result: unknown;
    if (command === "analyze")
      result = await loop.analyze({
        dimensions: (flag("dimensions") ?? "metadata.task").split(","),
      });
    else if (command === "candidates" || command === "events")
      result = await loop.list(command, { limit: 100 });
    else if (command === "import-v1")
      result = await importLegacyV1(
        loop,
        JSON.parse(await readFile(flag("input")!, "utf8")),
      );
    else if (command === "export")
      result = await loop.store.transaction(namespace, async (tx) =>
        Object.fromEntries(
          await Promise.all(
            collections.map(async (kind) => [
              kind,
              await readAll(tx, namespace, kind, 100000),
            ]),
          ),
        ),
      );
    else throw new Error(`Unknown command: ${command}`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await loop.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
