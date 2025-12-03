import { useState, useCallback, useRef, useMemo } from "react";
import { webRTCService } from "../../../../services/index";
import { getSocket } from "../../../../socket";
import { createMethodLogger } from "../utils/audioCallLogger";
import { CALL_STATUS, ERROR_MESSAGES } from "../constants/audioCallConstants";

export const useWebRTCSetup = (currentCall, userID, username) => {
  const logger = createMethodLogger("useWebRTCSetup");
  const loggerRef = useRef(logger);

  const [callStatus, setCallStatus] = useState(CALL_STATUS.INITIALIZING);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Refs để theo dõi trạng thái
  const callInitializedRef = useRef(false);
  const setupInProgressRef = useRef(false);
  const previousRoomRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const webRTCListenersRef = useRef([]);

  // Cache currentCall trong ref
  const currentCallRef = useRef(currentCall);
  currentCallRef.current = currentCall;

  const handleRemoteStream = useCallback((stream, isSpeakerOn = true) => {
    const currentLogger = loggerRef.current;
    currentLogger.info("Remote stream received", {
      streamId: stream?.id,
      active: stream?.active,
      audioTracks: stream?.getAudioTracks().length,
    });

    if (!stream) {
      currentLogger.warn("No stream received");
      return;
    }

    if (!remoteAudioRef.current) {
      currentLogger.debug("Creating new audio element");
      const audio = new Audio();
      audio.autoplay = true;
      audio.volume = isSpeakerOn ? 1.0 : 0.5;
      remoteAudioRef.current = audio;
    }

    try {
      remoteAudioRef.current.srcObject = stream;
      currentLogger.success("Remote audio setup complete");
    } catch (error) {
      currentLogger.error("Failed to set remote audio", error);
    }
  }, []);

  const setupWebRTCEventListeners = useCallback(
    (callbacks = {}) => {
      const currentLogger = loggerRef.current;
      currentLogger.info("Setting up WebRTC listeners");

      // Cleanup existing listeners first
      webRTCListenersRef.current.forEach(({ event, handler }) => {
        try {
          webRTCService.off(event, handler);
        } catch (err) {
          currentLogger.error(
            `Error removing existing listener for ${event}`,
            err
          );
        }
      });
      webRTCListenersRef.current = [];

      const listeners = [];

      const localStreamHandler = (stream) => {
        currentLogger.success("Local stream received", {
          streamId: stream.id,
          audioTracks: stream.getAudioTracks().length,
        });
        callbacks.onLocalStream?.(stream);
      };

      const remoteStreamHandler = (stream) => {
        currentLogger.success("Remote stream received", {
          streamId: stream.id,
          active: stream.active,
        });
        handleRemoteStream(stream);
        callbacks.onRemoteStream?.(stream);
      };

      const callConnectedHandler = () => {
        currentLogger.success("WebRTC call connected");
        setCallStatus(CALL_STATUS.CONNECTED);
        setIsConnecting(false);
        callbacks.onCallConnected?.();
      };

      const callEndedHandler = () => {
        currentLogger.info("Call ended from WebRTC service");
        setCallStatus(CALL_STATUS.DISCONNECTED);
        setIsConnecting(false);
        callbacks.onCallEnded?.();
      };

      const connectionStateHandler = (state) => {
        currentLogger.debug(`Connection state: ${state}`);
        callbacks.onConnectionStateChange?.(state);

        if (state === "connected") {
          setCallStatus(CALL_STATUS.CONNECTED);
          setIsConnecting(false);
          callbacks.onConnected?.();
        } else if (["disconnected", "failed", "closed"].includes(state)) {
          setCallStatus(CALL_STATUS.DISCONNECTED);
          if (state === "failed") {
            setError(ERROR_MESSAGES.CONNECTION_FAILED);
          }
          setIsConnecting(false);
        }
      };

      const iceConnectionStateHandler = (state) => {
        currentLogger.debug(`ICE Connection state: ${state}`);
        if (state === "failed") {
          currentLogger.error("ICE connection failed");
          setError(ERROR_MESSAGES.CONNECTION_FAILED);
        }
      };

      const signalingStateHandler = (state) => {
        currentLogger.debug(`Signaling state: ${state}`);
      };

      const errorHandler = (error) => {
        currentLogger.error("WebRTC error", error);
        setError(error.message || "Unknown WebRTC error");
        setCallStatus(CALL_STATUS.ERROR);
        setIsConnecting(false);
        callbacks.onError?.(error);
      };

      // Register listeners
      webRTCService.on("localStream", localStreamHandler);
      webRTCService.on("remoteStream", remoteStreamHandler);
      webRTCService.on("callConnected", callConnectedHandler);
      webRTCService.on("callEnded", callEndedHandler);
      webRTCService.on("connectionStateChange", connectionStateHandler);
      webRTCService.on("iceConnectionStateChange", iceConnectionStateHandler);
      webRTCService.on("signalingStateChange", signalingStateHandler);
      webRTCService.on("error", errorHandler);

      // Store cleanup functions
      listeners.push(
        { event: "localStream", handler: localStreamHandler },
        { event: "remoteStream", handler: remoteStreamHandler },
        { event: "callConnected", handler: callConnectedHandler },
        { event: "callEnded", handler: callEndedHandler },
        { event: "connectionStateChange", handler: connectionStateHandler },
        {
          event: "iceConnectionStateChange",
          handler: iceConnectionStateHandler,
        },
        { event: "signalingStateChange", handler: signalingStateHandler },
        { event: "error", handler: errorHandler }
      );

      webRTCListenersRef.current = listeners;
      currentLogger.success(`${listeners.length} WebRTC listeners registered`);

      // Return cleanup function
      return () => {
        currentLogger.info("Cleaning up WebRTC listeners");
        listeners.forEach(({ event, handler }) => {
          webRTCService.off(event, handler);
        });
      };
    },
    [handleRemoteStream]
  );

  const setupWebRTCAudioCall = useCallback(
    async (isIncoming = false, callbacks = {}) => {
      const currentCall = currentCallRef.current;
      const currentLogger = loggerRef.current;

      if (setupInProgressRef.current) {
        currentLogger.warn("Setup already in progress, skipping");
        return false;
      }

      if (!currentCall || !currentCall.roomID) {
        currentLogger.error("No current call or roomID");
        setError("No active call to setup");
        return false;
      }

      setupInProgressRef.current = true;

      try {
        setIsConnecting(true);
        setCallStatus(CALL_STATUS.INITIALIZING);
        setError(null);

        const socket = getSocket();
        if (!socket || !socket.connected) {
          throw new Error(ERROR_MESSAGES.SOCKET_NOT_CONNECTED);
        }

        const { roomID, id, from, to } = currentCall;
        const callId = id || `temp_${Date.now()}`;
        const targetUserId = isIncoming ? from : to;

        currentLogger.info("Setting up WebRTC audio call", {
          roomID,
          callId,
          isIncoming,
          targetUserId,
          previousRoom: previousRoomRef.current,
          userID,
          username,
        });

        if (
          webRTCService.hasActiveRoom() &&
          previousRoomRef.current !== roomID
        ) {
          currentLogger.warn(
            "WebRTC service is busy with another room, cleaning up"
          );
          await webRTCService.endCall();
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        if (
          previousRoomRef.current === roomID &&
          webRTCService.hasActiveRoom()
        ) {
          currentLogger.info("Already setup for this room, reusing");
          setupWebRTCEventListeners(callbacks);
          return true;
        }

        await webRTCService.initialize({
          userId: userID,
          username: username || "User",
          socket: socket,
          roomId: roomID,
          callId: callId,
          targetUserId: targetUserId,
          isVideoCall: false,
          isInitiator: !isIncoming,
        });

        const cleanupListeners = setupWebRTCEventListeners(callbacks);
        webRTCListenersRef.current.cleanup = cleanupListeners;

        previousRoomRef.current = roomID;
        callInitializedRef.current = true;

        if (isIncoming) {
          setCallStatus(CALL_STATUS.INCOMING);
          setIsConnecting(false);
          currentLogger.info("Waiting for incoming call setup");
        } else {
          setCallStatus(CALL_STATUS.CONNECTING);
          currentLogger.info("Starting outgoing call");

          let success = false;
          let attempts = 0;
          const maxAttempts = 2;

          while (!success && attempts < maxAttempts) {
            attempts++;
            try {
              currentLogger.info(
                `Starting call attempt ${attempts}/${maxAttempts}`
              );
              await webRTCService.startCall();
              success = true;
              currentLogger.success("Outgoing call started successfully");
            } catch (startError) {
              currentLogger.warn(
                `Call start attempt ${attempts} failed:`,
                startError
              );
              if (attempts < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 500));
              } else {
                throw startError;
              }
            }
          }

          if (!success) {
            throw new Error("Failed to start call after multiple attempts");
          }
        }

        return true;
      } catch (error) {
        const currentLogger = loggerRef.current;
        currentLogger.error("Failed to setup audio call", error);
        setError(error.message || ERROR_MESSAGES.SETUP_FAILED);
        setCallStatus(CALL_STATUS.ERROR);
        setIsConnecting(false);
        previousRoomRef.current = null;
        callInitializedRef.current = false;
        setupInProgressRef.current = false;
        callbacks.onError?.(error);
        return false;
      } finally {
        setupInProgressRef.current = false;
      }
    },
    [userID, username, setupWebRTCEventListeners]
  );

  const cleanupWebRTC = useCallback(async () => {
    const currentLogger = loggerRef.current;
    currentLogger.info("Cleaning up WebRTC");

    try {
      if (webRTCListenersRef.current.length > 0) {
        webRTCListenersRef.current.forEach(({ event, handler }) => {
          try {
            webRTCService.off(event, handler);
          } catch (err) {
            currentLogger.error(`Error removing listener for ${event}`, err);
          }
        });
        webRTCListenersRef.current = [];
      }

      if (webRTCListenersRef.current.cleanup) {
        try {
          webRTCListenersRef.current.cleanup();
        } catch (err) {
          currentLogger.error("Error calling listener cleanup", err);
        }
      }

      if (webRTCService.hasActiveRoom()) {
        await webRTCService.endCall();
      }

      if (remoteAudioRef.current) {
        try {
          remoteAudioRef.current.pause();
          remoteAudioRef.current.srcObject = null;
          remoteAudioRef.current = null;
        } catch (err) {
          currentLogger.error("Error cleaning audio element", err);
        }
      }

      previousRoomRef.current = null;
      callInitializedRef.current = false;
      setupInProgressRef.current = false;

      setCallStatus(CALL_STATUS.DISCONNECTED);
      setIsConnecting(false);

      currentLogger.success("WebRTC cleanup completed");
    } catch (error) {
      loggerRef.current.error("Error during WebRTC cleanup", error);
      throw error;
    }
  }, []);

  const toggleMicrophone = useCallback(
    (muted) => {
      try {
        const success = webRTCService.toggleMicrophone(muted);
        if (success) {
          logger.success(`Microphone ${muted ? "muted" : "unmuted"}`);
        } else {
          logger.warn("Failed to toggle microphone");
        }
        return success;
      } catch (error) {
        logger.error("Failed to toggle microphone", error);
        setError(error.message);
        return false;
      }
    },
    [setError]
  );

  const toggleAudioVolume = useCallback((isSpeakerOn) => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = isSpeakerOn ? 1.0 : 0.5;
      logger.debug("Audio volume updated", {
        volume: remoteAudioRef.current.volume,
      });
      return true;
    }
    return false;
  }, []);

  return {
    callStatus,
    setCallStatus,
    isConnecting,
    setIsConnecting,
    error,
    setError,
    setupWebRTCAudioCall,
    cleanupWebRTC,
    toggleMicrophone,
    toggleAudioVolume,
    handleRemoteStream,
  };
};
