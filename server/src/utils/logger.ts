import pino from "pino";
import { config } from "../config";

const logger = pino({
  level: config.logging.level,
  base: {
    env: config.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

const createLogger = (module: string) => logger.child({ module });

export { logger, createLogger };
