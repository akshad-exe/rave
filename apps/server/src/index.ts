import { runMigrations } from "@rave/db/migrate";

import { buildApp } from "./app";
import { ENV } from "./env";

const app = buildApp();

if (process.env.NODE_ENV !== "test") {
  await runMigrations(ENV.DATABASE_URL, (message) => app.log.warn(message));

  app.listen({ host: "0.0.0.0", port: 3000 }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info("server listening on port 3000");
  });
}
