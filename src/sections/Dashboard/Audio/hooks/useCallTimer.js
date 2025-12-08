// useCallTimer.js - VERSION ĐÃ TỐI ƯU
import { useState, useRef, useCallback, useEffect } from "react";
import { log } from "../utils/audioCallLogger";
import { formatDuration } from "../utils/callFormatters";

export const useCallTimer = () => {
  const [formattedTime, setFormattedTime] = useState("00:00");
  const secondsRef = useRef(0);
  const callTimerRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Throttle: chỉ update UI mỗi 2 giây
  const updateInterval = 2000; // ms

  const getFormattedDuration = useCallback(() => {
    return formatDuration(secondsRef.current);
  }, []);

  const startCallTimer = useCallback(() => {
    log.info("startCallTimer", "Starting optimized call timer");

    // Kiểm tra nếu đang chạy thì không start lại
    if (callTimerRef.current) {
      log.debug("Timer already running, skipping");
      return;
    }

    callTimerRef.current = setInterval(() => {
      secondsRef.current += 1;

      // Throttle: chỉ update state mỗi 2 giây
      const now = Date.now();
      if (now - lastUpdateRef.current > updateInterval) {
        setFormattedTime(getFormattedDuration());
        lastUpdateRef.current = now;

        // Debug log mỗi 10 giây
        if (secondsRef.current % 10 === 0) {
          log.debug("Call timer tick", {
            seconds: secondsRef.current,
            formatted: getFormattedDuration(),
          });
        }
      }
    }, 1000);
  }, [getFormattedDuration]);

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
    secondsRef.current = 0;
    setFormattedTime("00:00");
  }, [stopCallTimer]);

  // Force update khi component unmount
  const forceUpdateTime = useCallback(() => {
    setFormattedTime(getFormattedDuration());
  }, [getFormattedDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCallTimer();
    };
  }, [stopCallTimer]);

  return {
    callDuration: secondsRef.current, // Vẫn trả về số giây nếu cần
    formattedTime, // UI chỉ update mỗi 2 giây
    startCallTimer,
    stopCallTimer,
    resetCallTimer,
    forceUpdateTime,
    getFormattedDuration, // Function để lấy formatted time
  };
};
