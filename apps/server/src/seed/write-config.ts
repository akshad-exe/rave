/**
 * Writes the acceptance checker's config file.
 *
 * The config needs a cookie per role, signed with the same secret the server
 * uses. Rather than hand-maintaining those headers, this seeds the fixture and
 * signs in, then renders the file from that live state.
 *
 * Run it with the server stopped or running — either way the cookies are valid,
 * because only the secret has to match.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runMigrations } from "@rave/db/migrate";

import { auth, db } from "../composition/singletons";
import { ENV } from "../env";
import { renderDogfoodToml, runSeed } from "./index";

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);

/** Where the checker looks for its config by default. */
const configPath = process.env.DOGFOOD_CONFIG_PATH
  ? resolve(process.env.DOGFOOD_CONFIG_PATH)
  : resolve(REPO_ROOT, ".dogfood.toml");

/** Must match however the portal is actually reachable, including the port. */
const baseUrl = process.env.DOGFOOD_BASE_URL ?? "http://localhost:3000";

async function main(): Promise<void> {
  await runMigrations(ENV.DATABASE_URL, (message) =>
    process.stderr.write(`migrate: ${message}\n`)
  );

  const seeded = await runSeed({
    auth,
    db,
    log: (message) => process.stdout.write(`${message}\n`),
  });

  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(
    configPath,
    renderDogfoodToml(seeded.credentials, seeded.accounts, baseUrl),
    "utf8"
  );

  process.stdout.write(`wrote ${configPath} for ${baseUrl}\n`);
}

await main();
await db.$client.end();
