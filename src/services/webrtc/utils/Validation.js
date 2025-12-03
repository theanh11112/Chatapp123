/**
 * Validate required parameters
 */
export function validateRequiredParams(params) {
  const required = ["userId", "username", "socket", "roomId"];
  const missing = required.filter((field) => !params[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(", ")}`);
  }

  if (!params.socket.connected) {
    throw new Error("Socket is not connected");
  }
}

/**
 * Validate call ID
 */
export function isValidCallId(callId) {
  if (!callId) return false;
  if (typeof callId !== "string") return false;
  if (callId.startsWith("temp_")) return false;
  return true;
}

/**
 * Validate ICE candidate
 */
export function isValidIceCandidate(candidate) {
  if (!candidate) return false;
  if (typeof candidate !== "object") return false;
  if (!candidate.candidate && !candidate.sdpMLineIndex && !candidate.sdpMid) {
    return false;
  }
  return true;
}

/**
 * Validate SDP
 */
export function isValidSDP(sdp) {
  if (!sdp) return false;
  if (typeof sdp !== "object") return false;
  if (!sdp.type || !sdp.sdp) return false;
  if (!["offer", "answer", "pranswer", "rollback"].includes(sdp.type)) {
    return false;
  }
  return true;
}

/**
 * Validate room ID
 */
export function isValidRoomId(roomId) {
  if (!roomId) return false;
  if (typeof roomId !== "string") return false;
  if (roomId.trim().length === 0) return false;
  return true;
}

/**
 * Validate user ID
 */
export function isValidUserId(userId) {
  if (!userId) return false;
  if (typeof userId !== "string") return false;
  if (userId.trim().length === 0) return false;
  return true;
}
