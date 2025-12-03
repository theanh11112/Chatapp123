// src/services/webRTCService.js - COMPLETE VERSION (FIXED WITH ALL PATCHES)
class WebRTCService {
  constructor() {
    console.group("🎤 WebRTC Service Constructor");
    console.log("Initializing WebRTC Service...");

    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.userId = null;
    this.username = null;
    this.socket = null;
    this.roomId = null;
    this.callId = null;
    this.targetUserId = null;
    this.isInitiator = false;
    this.isVideoCall = false;
    this.setupAttempts = 0;
    this.isCallActive = false;
    this.isNegotiating = false;
    this.pendingCandidates = [];

    // ⭐ THÊM PROPERTY MỚI ĐỂ THEO DÕI ROOM HIỆN TẠI ⭐
    this.currentRoom = null;
    // ⭐ THÊM PROPERTY ĐỂ THEO DÕI TRACKS ĐÃ ĐƯỢC ADD ⭐
    this.addedTrackIds = new Set();

    this.eventHandlers = {
      localStream: [],
      remoteStream: [],
      callConnected: [],
      callEnded: [],
      connectionStateChange: [],
      iceConnectionStateChange: [],
      signalingStateChange: [],
      trackEnded: [],
      error: [],
    };

    this.configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
      sdpSemantics: "unified-plan",
    };

    console.log("✅ Service initialized with config:", this.configuration);
    console.groupEnd();
  }

  // ==================== LOGGING UTILITIES ====================
  _log(method, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [WebRTC:${method}]`;
    console.log(`${timestamp} ${prefix} ${message}`, data || "");
  }

  _logError(method, error, context = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [WebRTC:${method}] ❌`;
    console.error(`${timestamp} ${prefix} ${error.message}`);
    if (error.stack) console.error(error.stack);
    if (context) console.error("Context:", context);
  }

  _logSuccess(method, message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🎤 [WebRTC:${method}] ✅`;
    console.log(`${timestamp} ${prefix} ${message}`, data || "");
  }

  // Event handling methods
  on(event, handler) {
    this._log("on", `Adding handler for event: ${event}`);
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    } else {
      console.warn(`⚠️ Unknown event: ${event}`);
    }
  }

  off(event, handler) {
    this._log("off", `Removing handler for event: ${event}`);
    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  removeAllListeners() {
    this._log("removeAllListeners", "Removing all event handlers");
    Object.keys(this.eventHandlers).forEach((event) => {
      this.eventHandlers[event] = [];
    });
  }

  emitEvent(event, data) {
    this._log(
      "emitEvent",
      `Emitting ${event} to ${this.eventHandlers[event]?.length || 0} handlers`
    );
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this._logError("emitEvent", error, { event, data });
        }
      });
    }
  }

  /**
   * Initialize WebRTC service
   */
  async initialize({
    userId,
    username,
    socket,
    roomId,
    callId = null,
    targetUserId = null,
    isVideoCall = false,
    isInitiator = false,
  }) {
    console.group("🚀 WebRTC.initialize()");
    try {
      this._log("initialize", "Starting initialization", {
        userId,
        username: username?.substring(0, 10) + "...",
        roomId,
        callId,
        targetUserId,
        isVideoCall,
        isInitiator,
        socketConnected: socket?.connected,
        currentRoom: this.currentRoom,
        newRoomId: roomId,
        isSameRoom: this.currentRoom === roomId,
      });

      // ⭐ CHỈ RESET NẾU LÀ ROOM KHÁC ⭐
      if (this.currentRoom !== roomId) {
        await this.resetForNewConnection(roomId);
      } else {
        this._log("initialize", "Same room, skipping reset");
      }

      this.userId = userId;
      this.username = username;
      this.socket = socket;
      this.roomId = roomId;
      this.callId = callId;
      this.targetUserId = targetUserId;
      this.isVideoCall = isVideoCall;
      this.isInitiator = isInitiator;
      this.setupAttempts = 0;
      this.isCallActive = false;
      this.isNegotiating = false;

      // ⭐ CẬP NHẬT currentRoom ⭐
      this.currentRoom = roomId;

      this._logSuccess("initialize", "Service initialized successfully", {
        currentRoom: this.currentRoom,
      });
      console.groupEnd();
    } catch (error) {
      this._logError("initialize", error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Reset cho connection mới
   */
  async resetForNewConnection(newRoomId) {
    this._log("resetForNewConnection", `Resetting for new room: ${newRoomId}`, {
      currentRoom: this.currentRoom,
      hasPeerConnection: !!this.peerConnection,
      hasLocalStream: !!this.localStream,
      addedTrackIdsCount: this.addedTrackIds.size,
    });

    // ⭐ CHỈ END CALL NẾU ĐANG CÓ ROOM KHÁC ⭐
    if (this.peerConnection && this.currentRoom !== newRoomId) {
      await this.endCall();
    }

    this.userId = null;
    this.username = null;
    this.socket = null;
    this.roomId = null;
    this.callId = null;
    this.targetUserId = null;
    this.isInitiator = false;
    this.isVideoCall = false;
    this.setupAttempts = 0;
    this.isCallActive = false;
    this.isNegotiating = false;
    this.pendingCandidates = [];

    // ⭐ RESET addedTrackIds ⭐
    this.addedTrackIds.clear();

    this._logSuccess("resetForNewConnection", "Reset completed");
  }

  /**
   * Create peer connection
   */
  async createPeerConnection() {
    console.group("🔗 createPeerConnection()");
    try {
      if (this.peerConnection) {
        this._log("createPeerConnection", "Closing existing peer connection");
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this._log(
        "createPeerConnection",
        "Creating new RTCPeerConnection",
        this.configuration
      );

      // Kiểm tra RTCPeerConnection có tồn tại không
      if (typeof RTCPeerConnection === "undefined") {
        throw new Error(
          "RTCPeerConnection is not available in this environment"
        );
      }

      this.peerConnection = new RTCPeerConnection(this.configuration);
      this._logSuccess("createPeerConnection", "PeerConnection created", {
        connectionState: this.peerConnection.connectionState,
        signalingState: this.peerConnection.signalingState,
      });

      this.setupPeerConnectionHandlers();
      console.groupEnd();
      return this.peerConnection;
    } catch (error) {
      this._logError("createPeerConnection", error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Setup event handlers for peer connection
   */
  setupPeerConnectionHandlers() {
    this._log("setupPeerConnectionHandlers", "Setting up event handlers");

    // ICE candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this._log("onicecandidate", "New ICE candidate", {
          candidate: event.candidate.candidate?.substring(0, 50) + "...",
          socketConnected: this.socket?.connected,
        });

        if (this.socket && this.socket.connected) {
          this.socket.emit("webrtc_ice_candidate", {
            roomID: this.roomId,
            to: this.targetUserId,
            candidate: event.candidate,
            callId: this.callId,
          });
          this._logSuccess("onicecandidate", "ICE candidate sent via socket");
        }
      } else {
        this._log("onicecandidate", "All ICE candidates gathered");
      }
    };

    // Remote track handler
    this.peerConnection.ontrack = (event) => {
      this._logSuccess("ontrack", "Remote track received", {
        kind: event.track.kind,
        streamCount: event.streams.length,
        trackId: event.track.id,
      });

      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        this.emitEvent("remoteStream", this.remoteStream);
        this._log("ontrack", "Remote stream saved and emitted");
      }
    };

    // Connection state change handler
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this._log("onconnectionstatechange", `Connection state: ${state}`);

      this.emitEvent("connectionStateChange", state);

      switch (state) {
        case "connected":
          this._logSuccess(
            "onconnectionstatechange",
            "WebRTC connection established!"
          );
          this.isCallActive = true;
          this.emitEvent("callConnected");
          break;
        case "disconnected":
          this._log(
            "onconnectionstatechange",
            "WebRTC connection disconnected"
          );
          this.isCallActive = false;
          break;
        case "failed":
          this._logError(
            "onconnectionstatechange",
            new Error("WebRTC connection failed")
          );
          this.isCallActive = false;
          this.endCall().catch((err) =>
            this._logError(
              "onconnectionstatechange",
              err,
              "Error ending call after failure"
            )
          );
          break;
        case "closed":
          this._log("onconnectionstatechange", "WebRTC connection closed");
          this.isCallActive = false;
          break;
      }
    };

    // ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      this._log("oniceconnectionstatechange", `ICE connection state: ${state}`);
      this.emitEvent("iceConnectionStateChange", state);
    };

    // Signaling state
    this.peerConnection.onsignalingstatechange = () => {
      const state = this.peerConnection.signalingState;
      this._log("onsignalingstatechange", `Signaling state: ${state}`);
      this.emitEvent("signalingStateChange", state);
    };

    // Negotiation needed
    this.peerConnection.onnegotiationneeded = async () => {
      this._log("onnegotiationneeded", "Negotiation needed", {
        signalingState: this.peerConnection.signalingState,
        isNegotiating: this.isNegotiating,
        isInitiator: this.isInitiator,
      });

      if (!this.isInitiator) {
        this._log("onnegotiationneeded", "Not initiator, skipping negotiation");
        return;
      }

      if (this.isNegotiating) {
        this._log("onnegotiationneeded", "Already negotiating, skipping");
        return;
      }

      if (this.peerConnection.signalingState !== "stable") {
        this._log(
          "onnegotiationneeded",
          `Signaling state is ${this.peerConnection.signalingState}, skipping`
        );
        return;
      }

      try {
        this.isNegotiating = true;
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.createAndSendOffer();
        this._logSuccess("onnegotiationneeded", "Negotiation completed");
      } catch (error) {
        this._logError("onnegotiationneeded", error);
        this.emitEvent("error", error);
      } finally {
        this.isNegotiating = false;
      }
    };

    this._logSuccess("setupPeerConnectionHandlers", "All handlers set up");
  }

  /**
   * Setup track ended handlers for local stream
   */
  setupTrackEndedHandlers() {
    this._log("setupTrackEndedHandlers", "Setting up track ended handlers");

    if (!this.localStream) {
      this._log("setupTrackEndedHandlers", "No local stream available");
      return;
    }

    const tracks = this.localStream.getTracks();
    tracks.forEach((track) => {
      const originalOnEnded = track.onended;
      track.onended = (event) => {
        this._log("track.onended", `Track ended: ${track.kind}`, {
          trackId: track.id,
          enabled: track.enabled,
          muted: track.muted,
        });

        this.emitEvent("trackEnded", {
          track: track,
          kind: track.kind,
          event: event,
        });

        // Call original handler if exists
        if (typeof originalOnEnded === "function") {
          originalOnEnded(event);
        }

        // If audio track ended and we're in a call, end the call
        if (track.kind === "audio" && this.isCallActive) {
          this._log("track.onended", "Audio track ended, ending call");
          this.endCall().catch((error) =>
            this._logError("track.onended", error)
          );
        }
      };
    });

    this._logSuccess(
      "setupTrackEndedHandlers",
      `Setup handlers for ${tracks.length} tracks`
    );
  }

  /**
   * Add local tracks to peer connection - FIXED VERSION
   */
  async addLocalTracks() {
    this._log("addLocalTracks", "Adding local tracks to peer connection");

    if (!this.peerConnection) {
      throw new Error("Peer connection not initialized");
    }

    if (!this.localStream) {
      throw new Error("Local stream not available");
    }

    const audioTracks = this.localStream.getAudioTracks();
    const videoTracks = this.localStream.getVideoTracks();

    this._log("addLocalTracks", "Available tracks", {
      audioTracks: audioTracks.length,
      videoTracks: videoTracks.length,
      alreadyAddedTracks: this.addedTrackIds.size,
    });

    // ⭐ KIỂM TRA TRACKS ĐÃ ĐƯỢC ADD CHƯA TRƯỚC KHI ADD ⭐
    // Filter out tracks that are already added
    const tracksToAdd = [];

    // Check audio tracks
    audioTracks.forEach((track) => {
      if (!this.addedTrackIds.has(track.id)) {
        tracksToAdd.push({ track, kind: "audio" });
        this.addedTrackIds.add(track.id);
      } else {
        this._log(
          "addLocalTracks",
          `Audio track ${track.id} already added, skipping`
        );
      }
    });

    // Check video tracks if video call
    if (this.isVideoCall) {
      videoTracks.forEach((track) => {
        if (!this.addedTrackIds.has(track.id)) {
          tracksToAdd.push({ track, kind: "video" });
          this.addedTrackIds.add(track.id);
        } else {
          this._log(
            "addLocalTracks",
            `Video track ${track.id} already added, skipping`
          );
        }
      });
    }

    if (tracksToAdd.length === 0) {
      this._log("addLocalTracks", "All tracks already added, skipping");
      return;
    }

    // Add tracks
    tracksToAdd.forEach(({ track, kind }) => {
      try {
        this.peerConnection.addTrack(track, this.localStream);
        this._logSuccess("addLocalTracks", `${kind} track added`, {
          trackId: track.id,
          enabled: track.enabled,
        });
      } catch (trackError) {
        this._logError(
          "addLocalTracks",
          `Failed to add ${kind} track: ${trackError.message}`
        );
        // Remove from added set if failed
        this.addedTrackIds.delete(track.id);
      }
    });

    this._logSuccess(
      "addLocalTracks",
      `Added ${tracksToAdd.length} new tracks`
    );
  }

  /**
   * Process pending ICE candidates
   */
  async processPendingCandidates() {
    this._log("processPendingCandidates", "Processing pending candidates", {
      count: this.pendingCandidates.length,
    });

    if (!this.peerConnection) {
      this._log(
        "processPendingCandidates",
        "No peer connection, clearing pending candidates"
      );
      this.pendingCandidates = [];
      return;
    }

    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      try {
        await this.peerConnection.addIceCandidate(candidate);
        this._logSuccess("processPendingCandidates", "Pending candidate added");
      } catch (error) {
        this._logError("processPendingCandidates", error);
      }
    }
  }

  /**
   * Ensure stable SDP order
   */
  ensureStableSDPOrder(sdp) {
    if (!sdp || typeof sdp !== "string") {
      return sdp;
    }

    // Split SDP into lines
    const lines = sdp.split("\r\n");

    // Group lines by type
    const sessionLines = lines.filter(
      (line) =>
        line.startsWith("a=") ||
        line.startsWith("v=") ||
        line.startsWith("o=") ||
        line.startsWith("s=") ||
        line.startsWith("t=") ||
        line.startsWith("c=")
    );
    const mediaLines = lines.filter((line) => line.startsWith("m="));
    const attributeLines = lines.filter(
      (line) => line.startsWith("a=") && !mediaLines.includes(line)
    );

    // Reconstruct with stable order
    const stableSDP =
      [...sessionLines, ...mediaLines, ...attributeLines].join("\r\n") + "\r\n";

    this._log("ensureStableSDPOrder", "SDP stabilized", {
      originalLength: sdp.length,
      stabilizedLength: stableSDP.length,
    });

    return stableSDP;
  }

  /**
   * Start a call (initiator) - FIXED VERSION
   */
  async startCall() {
    console.group("📞 startCall()");
    try {
      this._log("startCall", "Starting call...", {
        currentRoom: this.currentRoom,
        roomId: this.roomId,
        callId: this.callId,
        isInitiator: this.isInitiator,
      });

      // ⭐ KIỂM TRA CẨN THẬN HƠN ⭐
      if (this.isBusy()) {
        const currentState = this.peerConnection?.signalingState;
        this._log("startCall", "Call is busy", {
          signalingState: currentState,
          hasLocalDesc: !!this.peerConnection?.localDescription,
          callId: this.callId,
        });

        // Chỉ resend offer nếu thực sự cần
        if (
          currentState === "have-local-offer" &&
          this.peerConnection.localDescription &&
          this.socket?.connected &&
          this._isValidCallId(this.callId) // ⭐ CHỈ GỬI KHI CALLID HỢP LỆ ⭐
        ) {
          this._log("startCall", "Resending existing offer");
          this.socket.emit("webrtc_offer", {
            roomID: this.roomId,
            to: this.targetUserId,
            offer: this.peerConnection.localDescription,
            callId: this.callId,
          });
        }
        console.groupEnd();
        return;
      }

      // ⭐ KIỂM TRA NẾU ĐÃ CÓ CALL KHÁC ĐANG ACTIVE ⭐
      if (this.currentRoom && this.currentRoom !== this.roomId) {
        this._log("startCall", "Ending previous call in different room");
        await this.endCall();
        // Đợi một chút để cleanup hoàn tất
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      this.isInitiator = true;
      this.setupAttempts += 1;

      this._log("startCall", `Setup attempt ${this.setupAttempts}/3`);

      if (this.setupAttempts > 3) {
        throw new Error("Too many setup attempts, please try again");
      }

      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      if (!this.localStream) {
        await this.getLocalMediaStream();
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.addLocalTracks();

      if (this.isInitiator && this.peerConnection.signalingState === "stable") {
        const offer = await this.createAndSendOffer();
        this._logSuccess("startCall", "Call started successfully with offer");
        console.groupEnd();
        return offer;
      }

      this._logSuccess("startCall", "Call setup completed");
      console.groupEnd();
      return null;
    } catch (error) {
      this._logError("startCall", error);

      if (
        error.name === "InvalidModificationError" ||
        error.name === "InvalidAccessError" ||
        error.message.includes("m-lines") ||
        error.message.includes("sender already exists")
      ) {
        this._log("startCall", "WebRTC error detected - Resetting connection");
        await this.endCall();
        console.groupEnd();
        throw new Error("Connection error, please try again");
      }

      console.groupEnd();
      throw error;
    }
  }

  /**
   * Get local media stream
   */
  async getLocalMediaStream() {
    console.group("🎤 getLocalMediaStream()");
    try {
      this._log("getLocalMediaStream", "Requesting media stream", {
        isVideoCall: this.isVideoCall,
        constraints: {
          audio: true,
          video: this.isVideoCall,
        },
      });

      // Kiểm tra navigator.mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("MediaDevices API is not available");
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video: this.isVideoCall
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 24 },
              facingMode: "user",
            }
          : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      this._logSuccess("getLocalMediaStream", "Media stream obtained", {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        audioEnabled: this.localStream.getAudioTracks()[0]?.enabled,
        videoEnabled: this.localStream.getVideoTracks()[0]?.enabled,
        streamId: this.localStream.id,
      });

      // Setup track ended handlers
      this.setupTrackEndedHandlers();

      this.emitEvent("localStream", this.localStream);
      console.groupEnd();
    } catch (mediaError) {
      this._logError("getLocalMediaStream", mediaError);

      if (mediaError.name === "NotAllowedError") {
        console.groupEnd();
        throw new Error(
          "Microphone/camera access denied. Please allow access in browser settings."
        );
      } else if (mediaError.name === "NotFoundError") {
        console.groupEnd();
        throw new Error(
          "No microphone/camera found. Please check your devices."
        );
      } else {
        console.groupEnd();
        throw mediaError;
      }
    }
  }

  /**
   * Create and send offer - FIXED COMPLETE VERSION
   */
  async createAndSendOffer() {
    console.group("📤 createAndSendOffer()");
    try {
      // ⭐ KIỂM TRA XEM SOCKET CÓ CONNECTED KHÔNG ⭐
      if (!this.socket?.connected) {
        this._logError("createAndSendOffer", new Error("Socket not connected"));
        throw new Error("Socket not connected");
      }

      this._log("createAndSendOffer", "Creating offer...", {
        signalingState: this.peerConnection?.signalingState,
        currentRoom: this.currentRoom,
        targetUserId: this.targetUserId,
        socketConnected: this.socket?.connected,
        socketId: this.socket?.id,
        callId: this.callId,
      });

      if (!this.peerConnection) {
        throw new Error("Peer connection not initialized");
      }

      if (this.peerConnection.signalingState !== "stable") {
        const currentState = this.peerConnection.signalingState;
        this._log(
          "createAndSendOffer",
          `Cannot create offer in state: ${currentState}`
        );

        if (
          currentState === "have-local-offer" &&
          this.peerConnection.localDescription
        ) {
          this._log("createAndSendOffer", "Resending existing offer");
          if (this.socket?.connected) {
            // ⭐ SỬ DỤNG FIRE-AND-FORGET CHO RESEND ⭐
            try {
              this.socket.emit("webrtc_offer", {
                roomID: this.roomId,
                to: this.targetUserId,
                offer: this.peerConnection.localDescription,
                callId: this.callId,
              });
              this._logSuccess("createAndSendOffer", "Existing offer resent");
            } catch (error) {
              this._logError(
                "createAndSendOffer",
                "Failed to resend offer",
                error
              );
            }
          }
          console.groupEnd();
          return this.peerConnection.localDescription;
        }

        this._log(
          "createAndSendOffer",
          "Resetting connection due to unstable state"
        );
        await this.createPeerConnection();
        await this.addLocalTracks();
      }

      // Định nghĩa offerOptions
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.isVideoCall,
        voiceActivityDetection: false,
        iceRestart: false,
      };

      this._log(
        "createAndSendOffer",
        "Creating offer with options:",
        offerOptions
      );

      const offer = await this.peerConnection.createOffer(offerOptions);

      this._log("createAndSendOffer", "Offer created", {
        type: offer.type,
        sdpLength: offer.sdp?.length || 0,
      });

      this._log("createAndSendOffer", "Setting local description...");
      await this.peerConnection.setLocalDescription(offer);
      this._logSuccess("createAndSendOffer", "Local description set", {
        newSignalingState: this.peerConnection.signalingState,
      });

      if (this.socket?.connected) {
        this._log(
          "createAndSendOffer",
          `Sending offer via socket to: ${this.targetUserId}`
        );

        // ⭐ SỬ DỤNG FIRE-AND-FORGET (KHÔNG DÙNG TIMEOUT CALLBACK) ⭐
        try {
          this.socket.emit("webrtc_offer", {
            roomID: this.roomId,
            to: this.targetUserId,
            offer: offer,
            callId: this.callId,
          });
          this._logSuccess(
            "createAndSendOffer",
            "Offer sent (fire-and-forget)"
          );
        } catch (socketError) {
          this._logError(
            "createAndSendOffer",
            "Socket emit failed",
            socketError
          );

          // ⭐ RETRY ONE TIME WITHOUT TIMEOUT ⭐
          setTimeout(() => {
            if (
              this.socket?.connected &&
              this.peerConnection?.localDescription
            ) {
              this._log("createAndSendOffer", "Retrying offer send...");
              try {
                this.socket.emit("webrtc_offer", {
                  roomID: this.roomId,
                  to: this.targetUserId,
                  offer: this.peerConnection.localDescription,
                  callId: this.callId,
                });
                this._logSuccess("createAndSendOffer", "Retry successful");
              } catch (retryError) {
                this._logError(
                  "createAndSendOffer",
                  "Retry failed",
                  retryError
                );
              }
            }
          }, 1000);
        }
      } else {
        this._logError(
          "createAndSendOffer",
          new Error("Socket not connected, cannot send offer")
        );
        throw new Error("Socket not connected");
      }

      console.groupEnd();
      return offer;
    } catch (error) {
      this._logError("createAndSendOffer", error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Handle incoming offer - FIXED COMPLETE VERSION
   */
  async handleOffer(offer) {
    console.group("📨 handleOffer()");
    try {
      this._log("handleOffer", "Handling offer", {
        type: offer.type,
        hasSDP: !!offer.sdp,
        signalingState: this.peerConnection?.signalingState,
        currentRoom: this.currentRoom,
      });

      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      if (!this.localStream) {
        await this.getLocalMediaStream();
      }

      // Kiểm tra trạng thái signaling
      const currentState = this.peerConnection.signalingState;
      if (currentState !== "stable" && currentState !== "have-local-offer") {
        this._log(
          "handleOffer",
          `Unexpected signaling state for offer: ${currentState}`
        );

        // Nếu đã có remote description, bỏ qua
        if (this.peerConnection.remoteDescription) {
          this._log("handleOffer", "Already have remote description, skipping");
          console.groupEnd();
          return;
        }
      }

      this._log("handleOffer", "Setting remote description...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      this._logSuccess("handleOffer", "Remote description set", {
        newSignalingState: this.peerConnection.signalingState,
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.addLocalTracks();

      this._log("handleOffer", "Creating answer...");
      const answer = await this.peerConnection.createAnswer();

      // Tạm thời bỏ qua ensureStableSDPOrder
      // if (answer.sdp) {
      //   answer.sdp = this.ensureStableSDPOrder(answer.sdp);
      // }

      await this.peerConnection.setLocalDescription(answer);
      this._logSuccess("handleOffer", "Answer created", {
        signalingState: this.peerConnection.signalingState,
      });

      // Gửi answer qua socket
      if (this.socket?.connected) {
        this.socket.emit("webrtc_answer", {
          roomID: this.roomId,
          to: this.targetUserId,
          answer: answer,
          callId: this.callId,
        });
        this._logSuccess("handleOffer", "Answer sent via socket");
      }

      // Xử lý các candidate đang chờ
      await this.processPendingCandidates();

      this._logSuccess("handleOffer", "Offer handled successfully");
      console.groupEnd();
    } catch (error) {
      this._logError("handleOffer", error);

      if (
        error.name === "InvalidStateError" ||
        error.message.includes("m-lines")
      ) {
        this._log("handleOffer", "Invalid state error, resetting connection");
        await this.endCall();
        console.groupEnd();
        throw new Error("Connection error, please try again");
      }

      console.groupEnd();
      throw error;
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(answer) {
    console.group("📨 handleAnswer()");
    try {
      this._log("handleAnswer", "Handling answer", {
        type: answer.type,
        hasSDP: !!answer.sdp,
        currentRoom: this.currentRoom,
        currentCallId: this.callId,
        isInitiator: this.isInitiator,
      });

      if (!this.peerConnection) {
        this._log("handleAnswer", "Creating new peer connection");
        await this.createPeerConnection();

        // Nếu là incoming call, cần có local stream
        if (!this.localStream && !this.isInitiator) {
          this._log("handleAnswer", "Getting local stream for non-initiator");
          await this.getLocalMediaStream();
          await this.addLocalTracks();
        }
      }

      const currentState = this.peerConnection.signalingState;

      // ⭐ XỬ LÝ CÁC TRẠNG THÁI KHÁC NHAU ⭐
      if (currentState === "stable" && this.peerConnection.remoteDescription) {
        this._log("handleAnswer", "Already have remote description, skipping");
        console.groupEnd();
        return;
      }

      if (currentState !== "have-local-offer") {
        this._log(
          "handleAnswer",
          `Unexpected signaling state for answer: ${currentState}, trying anyway`
        );
      }

      this._log("handleAnswer", "Setting remote description...");
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
      this._logSuccess("handleAnswer", "Answer handled", {
        newSignalingState: this.peerConnection.signalingState,
        connectionState: this.peerConnection.connectionState,
      });

      // ⭐ START CALL TIMER KHI ANSWER ĐƯỢC XỬ LÝ ⭐
      if (this.isInitiator) {
        this._log(
          "handleAnswer",
          "Initiator: answer received, connection should be established"
        );
        this.isCallActive = true;
        this.emitEvent("callConnected");
      }

      await this.processPendingCandidates();

      // ⭐ KIỂM TRA TRẠNG THÁI KẾT NỐI ⭐
      setTimeout(() => {
        if (this.peerConnection) {
          this._log("handleAnswer", "Checking connection state after answer", {
            connectionState: this.peerConnection.connectionState,
            iceConnectionState: this.peerConnection.iceConnectionState,
          });
        }
      }, 1000);

      console.groupEnd();
    } catch (error) {
      this._logError("handleAnswer", error);

      if (
        error.name === "InvalidStateError" ||
        error.message.includes("m-lines")
      ) {
        this._log("handleAnswer", "Invalid state error, resetting connection");
        await this.endCall();
        console.groupEnd();
        throw new Error("Connection error, please try again");
      }

      console.groupEnd();
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate) {
    this._log("addIceCandidate", "Adding ICE candidate", {
      candidate: candidate?.candidate?.substring(0, 50) + "...",
    });

    if (!this.peerConnection) {
      this._log("addIceCandidate", "No peer connection, storing candidate");
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
      this._logSuccess("addIceCandidate", "ICE candidate added");
    } catch (error) {
      this._logError("addIceCandidate", error);
      throw error;
    }
  }

  /**
   * End the call - FIXED VERSION
   */
  async endCall() {
    console.group("📴 endCall()");
    try {
      this._log("endCall", "Ending call...", {
        currentRoom: this.currentRoom,
        roomId: this.roomId,
        isCallActive: this.isCallActive,
        callId: this.callId,
      });

      this.isCallActive = false;
      this.isNegotiating = false;

      // ⭐ CHỈ GỬI SOCKET EVENT NẾU CALLID HỢP LỆ (KHÔNG PHẢI TEMP) ⭐
      if (
        this.socket?.connected &&
        this.roomId &&
        !this.callId?.startsWith?.("temp_")
      ) {
        try {
          this._log("endCall", "Sending call_ended event to socket");
          this.socket.emit("call_ended", {
            roomID: this.roomId,
            callId: this.callId,
          });
        } catch (socketError) {
          this._logError(
            "endCall",
            socketError,
            "Failed to send call ended event"
          );
        }
      } else if (this.callId?.startsWith?.("temp_")) {
        this._log("endCall", "Skipping socket emit for temp callId");
      }

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
          this._logSuccess("endCall", "Peer connection closed");
        } catch (pcError) {
          this._logError("endCall", pcError, "Error closing peer connection");
        }
        this.peerConnection = null;
      }

      if (this.localStream) {
        try {
          this.localStream.getTracks().forEach((track) => {
            track.stop();
            track.enabled = false;
          });
          this._logSuccess("endCall", "Local stream tracks stopped");
        } catch (streamError) {
          this._logError("endCall", streamError, "Error stopping local stream");
        }
        this.localStream = null;
      }

      if (this.remoteStream) {
        try {
          this.remoteStream.getTracks().forEach((track) => track.stop());
          this._logSuccess("endCall", "Remote stream cleared");
        } catch (error) {
          this._logError("endCall", error, "Error clearing remote stream");
        }
        this.remoteStream = null;
      }

      this.pendingCandidates = [];
      this.isInitiator = false;
      this.setupAttempts = 0;

      // ⭐ RESET addedTrackIds ⭐
      this.addedTrackIds.clear();

      // ⭐ RESET currentRoom CHỈ KHI ĐÃ END HOÀN TOÀN ⭐
      this.currentRoom = null;
      this.roomId = null;
      this.callId = null;
      this.targetUserId = null;

      this.emitEvent("callEnded");
      this._logSuccess("endCall", "Call ended successfully", {
        currentRoomAfterEnd: this.currentRoom,
      });
      console.groupEnd();
    } catch (error) {
      this._logError("endCall", error);
      console.groupEnd();
    }
  }

  /**
   * Kiểm tra if busy
   */
  isBusy() {
    if (!this.peerConnection) return false;

    const state = this.peerConnection.signalingState;
    const busy =
      state === "have-local-offer" ||
      state === "have-remote-offer" ||
      state === "have-local-pranswer" ||
      state === "have-remote-pranswer";

    this._log("isBusy", `Signaling state: ${state}, busy: ${busy}`);
    return busy;
  }

  /**
   * Toggle microphone
   */
  toggleMicrophone(mute) {
    this._log(
      "toggleMicrophone",
      mute ? "Muting microphone" : "Unmuting microphone",
      {
        hasLocalStream: !!this.localStream,
        currentRoom: this.currentRoom,
      }
    );

    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !mute;
      });
      this._logSuccess(
        "toggleMicrophone",
        `Microphone ${mute ? "muted" : "unmuted"}`
      );
      return true;
    }

    this._log("toggleMicrophone", "No local stream available");
    return false;
  }

  /**
   * Get call info
   */
  getCallInfo() {
    const info = {
      roomId: this.roomId,
      callId: this.callId,
      userId: this.userId,
      targetUserId: this.targetUserId,
      isInitiator: this.isInitiator,
      isVideoCall: this.isVideoCall,
      isCallActive: this.isCallActive,
      currentRoom: this.currentRoom,
      peerConnectionState: this.peerConnection?.connectionState,
      signalingState: this.peerConnection?.signalingState,
      addedTrackCount: this.addedTrackIds.size,
    };

    this._log("getCallInfo", "Call information", info);
    return info;
  }

  /**
   * Get call data for Redux - NEW METHOD
   */
  getCallDataForRedux() {
    const callData = {
      id: this.callId,
      callId: this.callId,
      roomID: this.roomId,
      from: this.userId,
      to: this.targetUserId,
      type: this.isVideoCall ? "video" : "audio",
      timestamp: new Date().toISOString(),
      status: "connecting",
      currentRoom: this.currentRoom,
    };

    this._log("getCallDataForRedux", "Generated call data", callData);
    return callData;
  }

  /**
   * Quick debug log - NEW METHOD
   */
  quickLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} 🎤 [WebRTC] ${message}`, data || "");
  }

  /**
   * Debug function
   */
  debug() {
    console.group("🔍 WebRTC Service Debug");
    console.log("Service State:", {
      userId: this.userId,
      roomId: this.roomId,
      callId: this.callId,
      targetUserId: this.targetUserId,
      isInitiator: this.isInitiator,
      isVideoCall: this.isVideoCall,
      isCallActive: this.isCallActive,
      currentRoom: this.currentRoom,
      setupAttempts: this.setupAttempts,
      isNegotiating: this.isNegotiating,
    });

    console.log("Streams:", {
      localStream: this.localStream
        ? {
            id: this.localStream.id,
            active: this.localStream.active,
            audioTracks: this.localStream.getAudioTracks().length,
            videoTracks: this.localStream.getVideoTracks().length,
          }
        : null,
      remoteStream: this.remoteStream
        ? {
            id: this.remoteStream.id,
            active: this.remoteStream.active,
          }
        : null,
    });

    console.log("Peer Connection:", {
      exists: !!this.peerConnection,
      connectionState: this.peerConnection?.connectionState,
      iceConnectionState: this.peerConnection?.iceConnectionState,
      signalingState: this.peerConnection?.signalingState,
    });

    console.log(
      "Event Handlers:",
      Object.keys(this.eventHandlers).reduce((acc, key) => {
        acc[key] = this.eventHandlers[key].length;
        return acc;
      }, {})
    );

    console.log("Pending ICE Candidates:", this.pendingCandidates.length);
    console.log("Added Track IDs:", Array.from(this.addedTrackIds));
    console.groupEnd();
  }

  /**
   * Kiểm tra xem có đang trong room nào không - NEW METHOD
   */
  hasActiveRoom() {
    const hasRoom = !!this.currentRoom && this.isCallActive;
    this._log("hasActiveRoom", `Has active room: ${hasRoom}`, {
      currentRoom: this.currentRoom,
      isCallActive: this.isCallActive,
    });
    return hasRoom;
  }

  /**
   * Kiểm tra xem có thể start call cho room mới không - NEW METHOD
   */
  canStartForRoom(roomId) {
    const canStart = !this.currentRoom || this.currentRoom === roomId;
    this._log("canStartForRoom", `Can start for room ${roomId}: ${canStart}`, {
      currentRoom: this.currentRoom,
      newRoomId: roomId,
      isCallActive: this.isCallActive,
    });
    return canStart;
  }
}

// Singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;

// Export for debugging
if (typeof window !== "undefined") {
  window.WebRTCService = webRTCService;
}
