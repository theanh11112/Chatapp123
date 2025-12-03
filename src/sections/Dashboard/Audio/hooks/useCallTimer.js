import { useState, useRef, useCallback } from "react";
import { log } from "../utils/audioCallLogger";
import { formatDuration } from "../utils/callFormatters";

export const useCallTimer = () => {
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef(null);

  const startCallTimer = useCallback(() => {
    log.info("startCallTimer", "Starting call timer");
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }
    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    log.info("stopCallTimer", "Stopping call timer");
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const resetCallTimer = useCallback(() => {
    log.info("resetCallTimer", "Resetting call timer");
    stopCallTimer();
    setCallDuration(0);
  }, [stopCallTimer]);

  const getFormattedDuration = useCallback(() => {
    return formatDuration(callDuration);
  }, [callDuration]);

  return {
    callDuration,
    setCallDuration,
    startCallTimer,
    stopCallTimer,
    resetCallTimer,
    getFormattedDuration,
  };
};
