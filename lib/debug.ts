const DEBUG = true;

// Define a type for loggable values
type LoggableValue = string | number | boolean | null | undefined | object;

export const debug = {
  auth: (...args: LoggableValue[]) => {
    if (DEBUG) {
      console.log('[Auth Debug]', ...args);
    }
  },
  error: (...args: LoggableValue[]) => {
    if (DEBUG) {
      console.error('[Auth Error]', ...args);
    }
  },
  warn: (...args: LoggableValue[]) => {
    if (DEBUG) {
      console.warn('[Auth Warning]', ...args);
    }
  }
}; 