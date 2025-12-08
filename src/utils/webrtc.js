// WebRTC utility functions
export const createPeerConnection = (config = {}) => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  return new RTCPeerConnection({
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    ...config,
  });
};

export const getUserMedia = async (
  constraints = { audio: true, video: false }
) => {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    console.error("Failed to get user media:", error);
    throw error;
  }
};

export const createOffer = async (peerConnection) => {
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await peerConnection.setLocalDescription(offer);
    return offer;
  } catch (error) {
    console.error("Failed to create offer:", error);
    throw error;
  }
};

export const createAnswer = async (peerConnection, remoteOffer) => {
  try {
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(remoteOffer)
    );
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer;
  } catch (error) {
    console.error("Failed to create answer:", error);
    throw error;
  }
};

// Send WebRTC signaling via socket
export const sendWebRTCMessage = (socket, type, data) => {
  if (!socket || !socket.connected) {
    throw new Error("Socket not connected");
  }

  const message = {
    ...data,
    timestamp: Date.now(),
  };

  socket.emit(type, message);
  console.log(`📤 Sent WebRTC ${type}:`, message);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`WebRTC ${type} timeout`));
    }, 5000);

    socket.once(`${type}_ack`, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
};
