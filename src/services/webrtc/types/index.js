/**
 * @typedef {Object} WebRTCServiceConfig
 * @property {string} userId
 * @property {string} username
 * @property {Object} socket
 * @property {string} roomId
 * @property {string} [callId]
 * @property {string} [targetUserId]
 * @property {boolean} [isVideoCall]
 * @property {boolean} [isInitiator]
 */

/**
 * @typedef {Object} CallData
 * @property {string} id
 * @property {string} callId
 * @property {string} roomID
 * @property {string} from
 * @property {string} to
 * @property {'audio'|'video'} type
 * @property {string} timestamp
 * @property {string} status
 * @property {string} currentRoom
 */

/**
 * @typedef {Object} TrackInfo
 * @property {MediaStreamTrack} track
 * @property {MediaStream} stream
 * @property {'audio'|'video'} kind
 * @property {boolean} enabled
 */

/**
 * @typedef {Object} IceCandidate
 * @property {string} candidate
 * @property {number} sdpMLineIndex
 * @property {string} sdpMid
 */

/**
 * @typedef {Object} SDP
 * @property {'offer'|'answer'|'pranswer'|'rollback'} type
 * @property {string} sdp
 */

/**
 * @typedef {Object} EventHandlers
 * @property {Function[]} localStream
 * @property {Function[]} remoteStream
 * @property {Function[]} callConnected
 * @property {Function[]} callEnded
 * @property {Function[]} connectionStateChange
 * @property {Function[]} iceConnectionStateChange
 * @property {Function[]} signalingStateChange
 * @property {Function[]} trackEnded
 * @property {Function[]} error
 */

// Export types
export const WebRTCServiceTypes = {
  WebRTCServiceConfig: "WebRTCServiceConfig",
  CallData: "CallData",
  TrackInfo: "TrackInfo",
  IceCandidate: "IceCandidate",
  SDP: "SDP",
  EventHandlers: "EventHandlers",
};
