type LogArgs = Array<unknown>;

function formatPrefix(level: string) {
  const ts = new Date().toISOString();
  return `[Pixdrive] [${level}] ${ts}`;
}

export const logger = {
  info: (...args: LogArgs) => console.info(formatPrefix("info"), ...args),
  warn: (...args: LogArgs) => console.warn(formatPrefix("warn"), ...args),
  error: (...args: LogArgs) => console.error(formatPrefix("error"), ...args),
  debug: (...args: LogArgs) => {
    if (process.env.NODE_ENV !== "production") console.debug(formatPrefix("debug"), ...args);
  },
};
