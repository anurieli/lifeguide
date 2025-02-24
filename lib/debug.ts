const DEBUG = true;

export const debug = {
  auth: (...args: any[]) => {
    if (DEBUG) {
      console.log('[Auth Debug]', ...args);
    }
  },
  error: (...args: any[]) => {
    if (DEBUG) {
      console.error('[Auth Error]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (DEBUG) {
      console.warn('[Auth Warning]', ...args);
    }
  }
}; 