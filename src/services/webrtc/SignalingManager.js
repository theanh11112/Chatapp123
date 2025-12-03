import Logger from "./Logger.js";

class SignalingManager {
  constructor(service) {
    this.service = service;
    this.logger = new Logger("SignalingManager");
    this.socket = null;
  }

  // ==================== CORE METHODS ====================

  /**
   * Set socket instance
   */
  setSocket(socket) {
    this.socket = socket;
    this.logger.log("Socket set", {
      socketConnected: socket?.connected,
      socketId: socket?.id,
    });
  }

  /**
   * Send offer via socket
   */
  async sendOffer(offer) {
    this.logger.log(
      `Sending offer via socket to: ${this.service.targetUserId}`
    );

    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    try {
      this.socket.emit("webrtc_offer", {
        roomID: this.service.roomId,
        to: this.service.targetUserId,
        offer: offer,
        callId: this.service.callId,
      });
      this.logger.success("Offer sent");
    } catch (socketError) {
      this.logger.error("Socket emit failed", socketError);
      throw socketError;
    }
  }

  /**
   * Send answer via socket
   */
  async sendAnswer(answer) {
    this.logger.log("Sending answer via socket");

    if (!this.socket?.connected) {
      throw new Error("Socket not connected");
    }

    try {
      this.socket.emit("webrtc_answer", {
        roomID: this.service.roomId,
        to: this.service.targetUserId,
        answer: answer,
        callId: this.service.callId,
      });
      this.logger.success("Answer sent");
    } catch (socketError) {
      this.logger.error("Socket emit failed", socketError);
      throw socketError;
    }
  }

  /**
   * Send ICE candidate via socket
   */
  sendICECandidate(candidate) {
    if (!this.socket?.connected) {
      this.logger.log("Socket not connected, skipping ICE candidate");
      return;
    }

    try {
      this.socket.emit("webrtc_ice_candidate", {
        roomID: this.service.roomId,
        to: this.service.targetUserId,
        candidate: candidate,
        callId: this.service.callId,
      });
      this.logger.success("ICE candidate sent");
    } catch (error) {
      this.logger.error("Failed to send ICE candidate", error);
    }
  }

  /**
   * Send call ended event
   */
  sendCallEnded() {
    this.logger.log("Sending call_ended event to socket");

    if (!this.socket?.connected) {
      this.logger.log("Socket not connected, skipping call ended");
      return;
    }

    try {
      this.socket.emit("call_ended", {
        roomID: this.service.roomId,
        callId: this.service.callId,
      });
      this.logger.success("Call ended event sent");
    } catch (socketError) {
      this.logger.error("Failed to send call ended event", socketError);
    }
  }

  /**
   * Resend existing offer
   */
  resendOffer() {
    this.logger.log("Resending existing offer");

    if (!this.socket?.connected) {
      this.logger.log("Socket not connected, skipping resend");
      return;
    }

    if (!this.service.peerManager.peerConnection?.localDescription) {
      this.logger.log("No local description available, skipping resend");
      return;
    }

    try {
      this.socket.emit("webrtc_offer", {
        roomID: this.service.roomId,
        to: this.service.targetUserId,
        offer: this.service.peerManager.peerConnection.localDescription,
        callId: this.service.callId,
      });
      this.logger.success("Offer resent");
    } catch (socketError) {
      this.logger.error("Failed to resend offer", socketError);
    }
  }

  // ==================== DEBUG ====================

  debug() {
    console.log("Signaling Manager:", {
      socketConnected: this.socket?.connected,
      socketId: this.socket?.id,
      roomId: this.service.roomId,
      targetUserId: this.service.targetUserId,
    });
  }
}

export default SignalingManager;
