import { getSocket } from "../../../socket";
import { log } from "./audioCallLogger";
import { CALL_TIMEOUTS } from "../constants/audioCallConstants";

export const emitWithRetry = async (
  eventName,
  data,
  retries = CALL_TIMEOUTS.MAX_RETRIES
) => {
  const socket = getSocket();
  if (!socket || !socket.connected) {
    throw new Error("Socket not connected");
  }

  return new Promise((resolve, reject) => {
    const attemptEmit = (attempt = 1) => {
      log.debug(
        "emitWithRetry",
        `Attempt ${attempt}/${retries} for ${eventName}`
      );

      socket
        .timeout(CALL_TIMEOUTS.SOCKET_TIMEOUT)
        .emit(eventName, data, (err, response) => {
          if (err) {
            if (attempt < retries) {
              const delay =
                Math.pow(2, attempt) * CALL_TIMEOUTS.RETRY_BACKOFF_BASE;
              log.warn(
                "emitWithRetry",
                `Retrying ${eventName} in ${delay}ms`,
                err
              );
              setTimeout(() => attemptEmit(attempt + 1), delay);
            } else {
              log.error(
                "emitWithRetry",
                `Failed after ${retries} attempts`,
                err
              );
              reject(err);
            }
          } else {
            log.success("emitWithRetry", `${eventName} successful`, response);
            resolve(response);
          }
        });
    };

    attemptEmit();
  });
};

export const checkSocketConnection = () => {
  const socket = getSocket();
  return {
    exists: !!socket,
    connected: socket?.connected || false,
    socketId: socket?.id,
  };
};

export const waitForSocketConnection = (timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    if (!socket) {
      reject(new Error("Socket not initialized"));
      return;
    }

    if (socket.connected) {
      resolve(socket);
      return;
    }

    const onConnect = () => {
      cleanup();
      resolve(socket);
    };

    const onTimeout = () => {
      cleanup();
      reject(new Error("Socket connection timeout"));
    };

    const cleanup = () => {
      socket.off("connect", onConnect);
      clearTimeout(timeoutId);
    };

    socket.on("connect", onConnect);
    const timeoutId = setTimeout(onTimeout, timeout);
  });
};
