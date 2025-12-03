// Export WebRTC service
export { default as webRTCService } from "./webrtc/index.js";

// Export WebRTC components for advanced usage
export { default as WebRTCService } from "./webrtc/WebRTCService.js";
export { default as PeerConnectionManager } from "./webrtc/PeerConnectionManager.js";
export { default as MediaStreamManager } from "./webrtc/MediaStreamManager.js";
export { default as SignalingManager } from "./webrtc/SignalingManager.js";
export { default as EventManager } from "./webrtc/EventManager.js";
export { default as Logger } from "./webrtc/Logger.js";
export { default as Config } from "./webrtc/Config.js";

// Export utilities
export { default as SDPProcessor } from "./webrtc/utils/SDPProcessor.js";
export * as SDPUtils from "./webrtc/utils/SDPProcessor.js"; // Named exports
export { default as TrackManager } from "./webrtc/utils/TrackManager.js";
export * from "./webrtc/utils/Validation.js";

// Export types
export * from "./webrtc/types/index.js";
