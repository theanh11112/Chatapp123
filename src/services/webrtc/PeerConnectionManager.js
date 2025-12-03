import Logger from "./Logger.js";
import Config from "./Config.js";
import SDPProcessor from "./utils/SDPProcessor.js"; // Import default
import TrackManager from "./utils/TrackManager.js";

class PeerConnectionManager {
  constructor(service) {
    this.service = service;
    this.logger = new Logger("PeerConnectionManager");

    this.peerConnection = null;
    this.pendingCandidates = [];
    this.isNegotiating = false;
    this.trackManager = new TrackManager();
  }

  // ==================== CORE METHODS ====================

  /**
   * Create peer connection
   */
  async createPeerConnection() {
    this.logger.group("🔗 createPeerConnection()");
    try {
      if (this.peerConnection) {
        this.logger.log("Closing existing peer connection");
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.logger.log("Creating new RTCPeerConnection", Config.peerConnection);

      if (typeof RTCPeerConnection === "undefined") {
        throw new Error(
          "RTCPeerConnection is not available in this environment"
        );
      }

      this.peerConnection = new RTCPeerConnection(Config.peerConnection);
      this.logger.success("PeerConnection created", {
        connectionState: this.peerConnection.connectionState,
        signalingState: this.peerConnection.signalingState,
      });

      this.setupPeerConnectionHandlers();
      this.logger.groupEnd();
      return this.peerConnection;
    } catch (error) {
      this.logger.error("createPeerConnection", error);
      this.logger.groupEnd();
      throw error;
    }
  }

  /**
   * Add local tracks to peer connection
   */
  async addLocalTracks() {
    this.logger.log("Adding local tracks to peer connection");

    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    const tracksAdded = await this.trackManager.addTracksToConnection(
      this.peerConnection,
      this.service.mediaManager.localStream,
      this.service.isVideoCall
    );

    if (tracksAdded > 0) {
      this.logger.success(`Added ${tracksAdded} new tracks`);
    }

    return tracksAdded;
  }

  /**
   * Create and send offer
   */
  async createAndSendOffer() {
    this.logger.group("📤 createAndSendOffer()");
    try {
      if (!this.service.socket?.connected) {
        throw new Error("Socket not connected");
      }

      this.logger.log("Creating offer...", {
        signalingState: this.peerConnection?.signalingState,
        currentRoom: this.service.currentRoom,
      });

      if (!this.peerConnection) {
        throw new Error("Peer connection not initialized");
      }

      // Check state
      if (this.peerConnection.signalingState !== "stable") {
        const currentState = this.peerConnection.signalingState;
        this.logger.log(`Cannot create offer in state: ${currentState}`);

        if (
          currentState === "have-local-offer" &&
          this.peerConnection.localDescription
        ) {
          this.logger.log("Resending existing offer");
          this.service.signalingManager.resendOffer();
          this.logger.groupEnd();
          return this.peerConnection.localDescription;
        }

        this.logger.log("Resetting connection due to unstable state");
        await this.createPeerConnection();
        await this.addLocalTracks();
      }

      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.service.isVideoCall,
        voiceActivityDetection: false,
        iceRestart: false,
      };

      this.logger.log("Creating offer with options:", offerOptions);
      const offer = await this.peerConnection.createOffer(offerOptions);

      this.logger.log("Offer created", {
        type: offer.type,
        sdpLength: offer.sdp?.length || 0,
      });

      // Process SDP
      if (offer.sdp) {
        offer.sdp = SDPProcessor.ensureStableOrder(offer.sdp);
      }

      this.logger.log("Setting local description...");
      await this.peerConnection.setLocalDescription(offer);
      this.logger.success("Local description set", {
        newSignalingState: this.peerConnection.signalingState,
      });

      // Send offer via signaling
      await this.service.signalingManager.sendOffer(offer);
      this.logger.success("Offer sent");

      this.logger.groupEnd();
      return offer;
    } catch (error) {
      this.logger.error("createAndSendOffer", error);
      this.logger.groupEnd();
      throw error;
    }
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(offer) {
    this.logger.group("📨 handleOffer()");
    try {
      this.logger.log("Handling offer", {
        type: offer.type,
        hasSDP: !!offer.sdp,
        signalingState: this.peerConnection?.signalingState,
      });

      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      // Check signaling state
      const currentState = this.peerConnection.signalingState;
      if (currentState !== "stable" && currentState !== "have-local-offer") {
        this.logger.log(
          `Unexpected signaling state for offer: ${currentState}`
        );

        if (this.peerConnection.remoteDescription) {
          this.logger.log("Already have remote description, skipping");
          this.logger.groupEnd();
          return;
        }
      }

      this.logger.log("Setting remote description...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      this.logger.success("Remote description set", {
        newSignalingState: this.peerConnection.signalingState,
      });

      // Add local tracks if not already added
      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.addLocalTracks();

      // Create and send answer
      this.logger.log("Creating answer...");
      const answer = await this.peerConnection.createAnswer();

      // Process SDP
      if (answer.sdp) {
        answer.sdp = SDPProcessor.ensureStableOrder(answer.sdp);
      }

      await this.peerConnection.setLocalDescription(answer);
      this.logger.success("Answer created", {
        signalingState: this.peerConnection.signalingState,
      });

      // Send answer via signaling
      await this.service.signalingManager.sendAnswer(answer);
      this.logger.success("Answer sent");

      // Process pending candidates
      await this.processPendingCandidates();

      this.logger.success("Offer handled successfully");
      this.logger.groupEnd();
    } catch (error) {
      this.logger.error("handleOffer", error);
      this.logger.groupEnd();
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(answer) {
    this.logger.group("📨 handleAnswer()");
    try {
      this.logger.log("Handling answer", {
        type: answer.type,
        hasSDP: !!answer.sdp,
      });

      if (!this.peerConnection) {
        this.logger.log("Creating new peer connection");
        await this.createPeerConnection();

        // Add local tracks for non-initiator
        if (!this.service.isInitiator) {
          await this.addLocalTracks();
        }
      }

      const currentState = this.peerConnection.signalingState;

      // Check state
      if (currentState === "stable" && this.peerConnection.remoteDescription) {
        this.logger.log("Already have remote description, skipping");
        this.logger.groupEnd();
        return;
      }

      if (currentState !== "have-local-offer") {
        this.logger.log(
          `Unexpected signaling state for answer: ${currentState}, trying anyway`
        );
      }

      this.logger.log("Setting remote description...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      this.logger.success("Answer handled", {
        newSignalingState: this.peerConnection.signalingState,
        connectionState: this.peerConnection.connectionState,
      });

      // Process pending candidates
      await this.processPendingCandidates();

      this.logger.groupEnd();
    } catch (error) {
      this.logger.error("handleAnswer", error);
      this.logger.groupEnd();
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate) {
    this.logger.log("Adding ICE candidate", {
      candidate: candidate?.candidate?.substring(0, 50) + "...",
    });

    if (!this.peerConnection) {
      this.logger.log("No peer connection, storing candidate");
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
      this.logger.success("ICE candidate added");
    } catch (error) {
      this.logger.error("addIceCandidate", error);
      throw error;
    }
  }

  /**
   * Process pending ICE candidates
   */
  async processPendingCandidates() {
    this.logger.log("Processing pending candidates", {
      count: this.pendingCandidates.length,
    });

    if (!this.peerConnection) {
      this.logger.log("No peer connection, clearing pending candidates");
      this.pendingCandidates = [];
      return;
    }

    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(candidate);
        this.logger.success("Pending candidate added");
      } catch (error) {
        this.logger.error("processPendingCandidates", error);
      }
    }
  }

  /**
   * Setup peer connection event handlers
   */
  setupPeerConnectionHandlers() {
    this.logger.log("Setting up event handlers");

    // ICE candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.logger.log("New ICE candidate", {
          candidate: event.candidate.candidate?.substring(0, 50) + "...",
          socketConnected: this.service.socket?.connected,
        });

        if (this.service.socket?.connected) {
          this.service.signalingManager.sendICECandidate(event.candidate);
        }
      } else {
        this.logger.log("All ICE candidates gathered");
      }
    };

    // Remote track handler
    this.peerConnection.ontrack = (event) => {
      this.logger.success("Remote track received", {
        kind: event.track.kind,
        streamCount: event.streams.length,
        trackId: event.track.id,
      });

      if (event.streams && event.streams.length > 0) {
        this.service.mediaManager.setRemoteStream(event.streams[0]);
        this.service.eventManager.emit("remoteStream", event.streams[0]);
        this.logger.log("Remote stream saved and emitted");
      }
    };

    // Connection state change handler
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.logger.log(`Connection state: ${state}`);

      this.service.eventManager.emit("connectionStateChange", state);

      switch (state) {
        case "connected":
          this.logger.success("WebRTC connection established!");
          this.service.isCallActive = true;
          this.service.eventManager.emit("callConnected");
          break;
        case "disconnected":
          this.logger.log("WebRTC connection disconnected");
          this.service.isCallActive = false;
          break;
        case "failed":
          this.logger.error(new Error("WebRTC connection failed"));
          this.service.isCallActive = false;
          this.service
            .endCall()
            .catch((err) =>
              this.logger.error(err, "Error ending call after failure")
            );
          break;
        case "closed":
          this.logger.log("WebRTC connection closed");
          this.service.isCallActive = false;
          break;
        default:
          this.logger.log(`Unknown connection state: ${state}`);
          break;
      }
    };

    // ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      this.logger.log(`ICE connection state: ${state}`);
      this.service.eventManager.emit("iceConnectionStateChange", state);
    };

    // Signaling state
    this.peerConnection.onsignalingstatechange = () => {
      const state = this.peerConnection.signalingState;
      this.logger.log(`Signaling state: ${state}`);
      this.service.eventManager.emit("signalingStateChange", state);
    };

    // Negotiation needed
    this.peerConnection.onnegotiationneeded = async () => {
      this.logger.log("Negotiation needed", {
        signalingState: this.peerConnection.signalingState,
        isNegotiating: this.isNegotiating,
        isInitiator: this.service.isInitiator,
      });

      if (!this.service.isInitiator) {
        this.logger.log("Not initiator, skipping negotiation");
        return;
      }

      if (this.isNegotiating) {
        this.logger.log("Already negotiating, skipping");
        return;
      }

      if (this.peerConnection.signalingState !== "stable") {
        this.logger.log(
          `Signaling state is ${this.peerConnection.signalingState}, skipping`
        );
        return;
      }

      try {
        this.isNegotiating = true;
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.createAndSendOffer();
        this.logger.success("Negotiation completed");
      } catch (error) {
        this.logger.error("onnegotiationneeded", error);
        this.service.eventManager.emit("error", error);
      } finally {
        this.isNegotiating = false;
      }
    };

    this.logger.success("All handlers set up");
  }

  /**
   * Check if busy
   */
  isBusy() {
    if (!this.peerConnection) return false;

    const state = this.peerConnection.signalingState;
    const busy =
      state === "have-local-offer" ||
      state === "have-remote-offer" ||
      state === "have-local-pranswer" ||
      state === "have-remote-pranswer";

    this.logger.log(`Signaling state: ${state}, busy: ${busy}`);
    return busy;
  }

  /**
   * Cleanup peer connection
   */
  async cleanup() {
    this.logger.log("Cleaning up peer connection");

    if (this.peerConnection) {
      try {
        // Remove all event handlers
        this.peerConnection.onicecandidate = null;
        this.peerConnection.ontrack = null;
        this.peerConnection.onconnectionstatechange = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.onnegotiationneeded = null;

        this.peerConnection.close();
        this.logger.success("Peer connection closed");
      } catch (pcError) {
        this.logger.error(pcError, "Error closing peer connection");
      }
      this.peerConnection = null;
    }

    this.pendingCandidates = [];
    this.isNegotiating = false;
    this.trackManager.reset();

    this.logger.success("Cleanup completed");
  }

  // ==================== GETTERS ====================

  getConnectionState() {
    return this.peerConnection?.connectionState;
  }

  getSignalingState() {
    return this.peerConnection?.signalingState;
  }

  hasPeerConnection() {
    return !!this.peerConnection;
  }

  hasLocalDescription() {
    return !!this.peerConnection?.localDescription;
  }

  // ==================== DEBUG ====================

  debug() {
    console.log("Peer Connection:", {
      exists: !!this.peerConnection,
      connectionState: this.peerConnection?.connectionState,
      iceConnectionState: this.peerConnection?.iceConnectionState,
      signalingState: this.peerConnection?.signalingState,
    });

    console.log("Track Manager:", this.trackManager.getInfo());
    console.log("Pending ICE Candidates:", this.pendingCandidates.length);
  }
}

export default PeerConnectionManager;
