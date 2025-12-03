import {
  DEBUG,
  DEBUG_SOCKET_EVENTS,
  LOG_PREFIX,
} from "../constants/audioCallConstants";

export const getTimestamp = () => {
  return new Date().toLocaleTimeString();
};

export const logSocketEvent = (eventName, ...args) => {
  if (
    DEBUG_SOCKET_EVENTS &&
    (eventName.includes("call") ||
      eventName.includes("audio") ||
      eventName.includes("webrtc"))
  ) {
    const timestamp = getTimestamp();
    console.log(
      `${timestamp} ${LOG_PREFIX} 🔌 Socket event: ${eventName}`,
      args
    );
  }
};

const createLogger =
  (level) =>
  (method, message, data = null) => {
    const timestamp = getTimestamp();
    const logMessage = `${timestamp} ${LOG_PREFIX} ${method} ${level} ${message}`;

    if (data !== null) {
      console[
        level === "✅"
          ? "log"
          : level === "❌"
          ? "error"
          : level === "⚠️"
          ? "warn"
          : level === "🔍"
          ? "debug"
          : "log"
      ](logMessage, data);
    } else {
      console[
        level === "✅"
          ? "log"
          : level === "❌"
          ? "error"
          : level === "⚠️"
          ? "warn"
          : level === "🔍"
          ? "debug"
          : "log"
      ](logMessage);
    }
  };

export const log = {
  info: createLogger("ℹ️"),
  success: createLogger("✅"),
  error: createLogger("❌"),
  warn: createLogger("⚠️"),
  debug: (method, message, data = null) => {
    if (!DEBUG) return;
    createLogger("🔍")(method, message, data);
  },
};

export const createMethodLogger = (methodName) => ({
  info: (message, data = null) => log.info(methodName, message, data),
  success: (message, data = null) => log.success(methodName, message, data),
  error: (message, error = null) => log.error(methodName, message, error),
  warn: (message, data = null) => log.warn(methodName, message, data),
  debug: (message, data = null) => log.debug(methodName, message, data),
});
