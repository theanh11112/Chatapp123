class Logger {
  constructor(context = "WebRTC") {
    this.context = context;
    this.enabled = process.env.NODE_ENV !== "production";
  }

  // ==================== CORE LOGGING ====================

  log(method, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [${this.context}:${method}]`;
    console.log(`${timestamp} ${prefix} ${message}`, data || "");
  }

  error(method, error, context = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [${this.context}:${method}] ❌`;
    console.error(`${timestamp} ${prefix} ${error.message}`);
    if (error.stack) console.error(error.stack);
    if (context) console.error("Context:", context);
  }

  success(method, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [${this.context}:${method}] ✅`;
    console.log(`${timestamp} ${prefix} ${message}`, data || "");
  }

  warn(method, message, data = null) {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [${this.context}:${method}] ⚠️`;
    console.warn(`${timestamp} ${prefix} ${message}`, data || "");
  }

  // ==================== UTILITY METHODS ====================

  group(name) {
    if (!this.enabled) return;
    console.group(name);
  }

  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }

  // ==================== INSTANCE SHORTHAND ====================

  _log(message, data = null) {
    this.log("", message, data);
  }

  _error(error, context = null) {
    this.error("", error, context);
  }

  _success(message, data = null) {
    this.success("", message, data);
  }

  _warn(message, data = null) {
    this.warn("", message, data);
  }
}

export default Logger;
