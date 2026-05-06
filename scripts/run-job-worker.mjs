#!/usr/bin/env node
import { startWorker } from "../src/lib/job-queue.js";
import { logger } from "../src/lib/logger.js";

(async function () {
  try {
    await startWorker(2000);
  } catch (err) {
    logger.error("[worker] fatal", err);
    process.exit(1);
  }
})();
