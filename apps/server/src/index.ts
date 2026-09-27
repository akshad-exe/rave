import { runMigrations } from "@rave/db/migrate";

import { buildApp } from "./app";
import { auth, db } from "./composition/singletons";
import { ENV } from "./env";
import { formatLoginBlock, runSeed } from "./seed";

const app = buildApp();

if (process.env.NODE_ENV !== "test") {
  await runMigrations(ENV.DATABASE_URL, (message) => app.log.warn(message));

  // Seeding is idempotent, so it runs on every boot: a fresh volume gets the
  // fixture, and an existing one is left untouched. The credentials are
  // printed each time because the acceptance checker needs session cookies
  // signed by this server, without invalidating previously issued ones.
  const seeded = await runSeed({
    auth,
    db,
    log: (message) => app.log.info(message),
  });

  app.log.info({ notes: seeded.notes }, "fixture seed complete");
  // Printed to stdout rather than the log so it can be copied straight into
  // `.dogfood.toml`, which is the workflow the DOGFOOD spec describes.
  process.stdout.write(`${formatLoginBlock(seeded.credentials)}\n`);

  app.listen({ host: "0.0.0.0", port: ENV.PORT }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`server listening on port ${ENV.PORT}`);
  });
}
