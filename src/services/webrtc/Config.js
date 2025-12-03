const Config = {
  // ICE servers configuration
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],

  // Peer connection configuration
  peerConnection: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
    ],
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    sdpSemantics: "unified-plan",
  },

  // Media constraints
  mediaConstraints: {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
    },
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 24 },
      facingMode: "user",
    },
  },

  // Timeout values
  timeouts: {
    offer: 5000,
    answer: 5000,
    iceCandidate: 10000,
    connection: 30000,
    reconnect: 3000,
  },

  // Retry configuration
  retry: {
    maxAttempts: 3,
    delay: 1000,
  },
};

export default Config;
