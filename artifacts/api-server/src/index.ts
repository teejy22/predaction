import app from "./app";
import * as indexStore from "./lib/index-store";
import { getSnapshot, setIndexStore } from "./lib/kalshi";
import { logger } from "./lib/logger";

setIndexStore(indexStore);

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Load the saved market index and start refreshing it before the first visitor arrives.
  void getSnapshot().catch((err) => logger.warn({ err }, "Market index warm-up failed"));
});
