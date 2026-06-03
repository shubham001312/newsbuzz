export function createLogger(name) {
  function timestamp() {
    return new Date().toISOString();
  }

  return {
    info(msg, data) {
      const extra = data ? ' ' + JSON.stringify(data) : '';
      console.log(`[${timestamp()}] [INFO] [${name}] ${msg}${extra}`);
    },
    warn(msg, data) {
      const extra = data ? ' ' + JSON.stringify(data) : '';
      console.warn(`[${timestamp()}] [WARN] [${name}] ${msg}${extra}`);
    },
    error(msg, err) {
      const extra = err ? ' ' + (err.stack || err.message || JSON.stringify(err)) : '';
      console.error(`[${timestamp()}] [ERROR] [${name}] ${msg}${extra}`);
    },
    success(msg, data) {
      const extra = data ? ' ' + JSON.stringify(data) : '';
      console.log(`[${timestamp()}] [OK]   [${name}] ${msg}${extra}`);
    }
  };
}
