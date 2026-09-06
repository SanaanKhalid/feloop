import { spawnSync } from "node:child_process";
const env = { ...process.env };
// A caller may itself be running under `npm exec -c`; do not inherit its command.
delete env.npm_config_call;
delete env.npm_config_package;
const result = spawnSync(
  "npx",
  ["--yes", "fern-api@5.113.1", "check", "--warnings"],
  { env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
);
process.stdout.write(result.stdout ?? "");
process.stderr.write(result.stderr ?? "");
// Fern can classify MDX parse failures as warnings and still exit 0. Treat them as a gate.
if (
  result.error ||
  result.status !== 0 ||
  /\[warning\]|\[error\]|Markdown failed to parse/i.test(
    `${result.stdout}${result.stderr}`,
  )
)
  process.exitCode = 1;
