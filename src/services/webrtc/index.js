import WebRTCService from "./WebRTCService.js";

// Singleton instance
const webRTCService = new WebRTCService();

// Export for debugging
if (typeof window !== "undefined") {
  window.WebRTCService = webRTCService;
}

export default webRTCService;
