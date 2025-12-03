export const DEBUG = true;
export const DEBUG_SOCKET_EVENTS = true;

export const LOG_PREFIX = "🎧 [AudioCallDialog]";

export const CALL_STATUS = {
  INITIALIZING: "Initializing...",
  RINGING: "Call ringing...",
  INCOMING: "Incoming call...",
  CONNECTING: "Connecting...",
  CONNECTED: "Connected",
  DISCONNECTED: "Disconnected",
  ENDED: "Ended",
  ERROR: "Error",
};

export const SOCKET_EVENTS = {
  WEBRTC_OFFER: "webrtc_offer",
  WEBRTC_ANSWER: "webrtc_answer",
  WEBRTC_ICE_CANDIDATE: "webrtc_ice_candidate",
  AUDIO_CALL_ACCEPTED: "audio_call_accepted",
  CALL_ACCEPTED: "call_accepted",
  AUDIO_CALL_ENDED: "audio_call_ended",
  CALL_ENDED: "call_ended",
  END_CALL: "end_call",
};

export const WEBRTC_STATES = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  FAILED: "failed",
  CLOSED: "closed",
};

export const CALL_TIMEOUTS = {
  AUTO_REJECT: 30000, // 30 seconds
  SOCKET_TIMEOUT: 5000,
  RETRY_BACKOFF_BASE: 1000,
  MAX_RETRIES: 3,
};

export const ERROR_MESSAGES = {
  SOCKET_NOT_CONNECTED: "Socket not connected. Please refresh page.",
  NO_ACTIVE_CALL: "No active call information.",
  SETUP_FAILED: "Failed to setup audio call.",
  CONNECTION_FAILED: "Connection failed. Please try again.",
};
