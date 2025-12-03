import PeerConnectionManager from "./PeerConnectionManager.js";
import MediaStreamManager from "./MediaStreamManager.js";
import SignalingManager from "./SignalingManager.js";
import EventManager from "./EventManager.js";
import Logger from "./Logger.js";
import Config from "./Config.js";
import { validateRequiredParams, isValidCallId } from "./utils/Validation.js";

class WebRTCService {
  constructor() {
    this.logger = new Logger("WebRTCService");
    this.peerManager = new PeerConnectionManager(this);
    this.mediaManager = new MediaStreamManager(this);
    this.signalingManager = new SignalingManager(this);
    this.eventManager = new EventManager(this);

    this.logger.group("🎤 WebRTC Service Constructor");
    this.logger.log("Initializing WebRTC Service...");

    // Core state - FIXED: Thêm flags để tránh race conditions
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

    // State management flags - FIXED: Thêm flags để quản lý state
    this.currentRoom = null;
    this._isInitializing = false;
    this._isEndingCall = false;
    this._pendingOperations = new Set();
    this._cleanupInProgress = false;
    this._microphoneMuted = false; // Thêm state tracking cho microphone

    this.logger.success("Service initialized");
    this.logger.groupEnd();
  }

  // ==================== PUBLIC API ====================

  /**
   * Initialize WebRTC service - FIXED: Thêm lock để tránh race condition
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
    const operationId = `init_${Date.now()}`;
    this._pendingOperations.add(operationId);

    this.logger.group("🚀 WebRTC.initialize()");
    try {
      // Check if already initializing
      if (this._isInitializing) {
        this.logger.warn("Already initializing, skipping duplicate");
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        return;
      }

      this._isInitializing = true;

      validateRequiredParams({ userId, username, socket, roomId });

      this.logger.log("Starting initialization", {
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

      // Only reset if different room
      if (this.currentRoom !== roomId) {
        await this.resetForNewConnection(roomId);
      } else {
        this.logger.log("Same room, skipping reset");
      }

      // Update service state
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
      this._microphoneMuted = false;

      // Update current room
      this.currentRoom = roomId;

      // Setup signaling
      this.signalingManager.setSocket(socket);

      this.logger.success("Service initialized successfully", {
        currentRoom: this.currentRoom,
      });
      this.logger.groupEnd();
    } catch (error) {
      this.logger.error("initialize", error);
      this.logger.groupEnd();
      throw error;
    } finally {
      this._isInitializing = false;
      this._pendingOperations.delete(operationId);
    }
  }

  /**
   * Start a call (initiator) - FIXED: Thêm state checking
   */
  async startCall() {
    const operationId = `start_${Date.now()}`;
    this._pendingOperations.add(operationId);

    this.logger.group("📞 startCall()");
    try {
      this.logger.log("Starting call...", {
        currentRoom: this.currentRoom,
        roomId: this.roomId,
        callId: this.callId,
        isInitiator: this.isInitiator,
        isCallActive: this.isCallActive,
        isEnding: this._isEndingCall,
      });

      // Check if call is already active or ending
      if (this.isCallActive || this._isEndingCall) {
        this.logger.warn("Call is already active or ending, skipping start");
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        return null;
      }

      // Check if busy
      if (this.isBusy()) {
        const currentState = this.peerManager.getSignalingState();
        this.logger.log("Call is busy", {
          signalingState: currentState,
          callId: this.callId,
        });

        // Only resend offer if needed
        if (
          currentState === "have-local-offer" &&
          this.peerManager.hasLocalDescription() &&
          this.socket?.connected &&
          isValidCallId(this.callId)
        ) {
          this.logger.log("Resending existing offer");
          this.signalingManager.resendOffer();
        }
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        return null;
      }

      // Check if different room is active
      if (this.currentRoom && this.currentRoom !== this.roomId) {
        this.logger.log("Ending previous call in different room");
        await this.endCall();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      this.isInitiator = true;
      this.setupAttempts += 1;

      this.logger.log(`Setup attempt ${this.setupAttempts}/3`);

      if (this.setupAttempts > 3) {
        throw new Error("Too many setup attempts, please try again");
      }

      // Create peer connection
      await this.peerManager.createPeerConnection();

      // Get local media stream
      await this.mediaManager.getLocalMediaStream();

      // Add local tracks
      await new Promise((resolve) => setTimeout(resolve, 300));
      await this.peerManager.addLocalTracks();

      // Create and send offer if initiator
      if (
        this.isInitiator &&
        this.peerManager.getSignalingState() === "stable"
      ) {
        const offer = await this.peerManager.createAndSendOffer();
        this.logger.success("Call started successfully with offer");
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        return offer;
      }

      this.logger.success("Call setup completed");
      this.logger.groupEnd();
      this._pendingOperations.delete(operationId);
      return null;
    } catch (error) {
      this.logger.error("startCall", error);

      if (
        error.name === "InvalidModificationError" ||
        error.name === "InvalidAccessError" ||
        error.message.includes("m-lines") ||
        error.message.includes("sender already exists")
      ) {
        this.logger.log("WebRTC error detected - Resetting connection");
        await this.endCall();
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        throw new Error("Connection error, please try again");
      }

      this.logger.groupEnd();
      this._pendingOperations.delete(operationId);
      throw error;
    }
  }

  /**
   * Handle incoming offer - FIXED: Thêm operation tracking
   */
  async handleOffer(offer) {
    const operationId = `offer_${Date.now()}`;
    this._pendingOperations.add(operationId);

    this.logger.group("📨 handleOffer()");
    try {
      this.logger.log("Handling offer", {
        type: offer.type,
        hasSDP: !!offer.sdp,
        currentRoom: this.currentRoom,
        isCallActive: this.isCallActive,
        isEnding: this._isEndingCall,
      });

      // Check if we should accept offer
      if (this._isEndingCall || this._cleanupInProgress) {
        this.logger.warn("Service is ending or cleaning up, ignoring offer");
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        return;
      }

      await this.peerManager.handleOffer(offer);
      this.logger.success("Offer handled successfully");
      this.logger.groupEnd();
      this._pendingOperations.delete(operationId);
    } catch (error) {
      this.logger.error("handleOffer", error);
      this.logger.groupEnd();
      this._pendingOperations.delete(operationId);
      throw error;
    }
  }

  /**
   * Handle incoming answer - FIXED: Thêm state validation
   */
  async handleAnswer(answer) {
    const operationId = `answer_${Date.now()}`;
    this._pendingOperations.add(operationId);

    this.logger.group("📨 handleAnswer()");
    try {
      this.logger.log("Handling answer", {
        type: answer.type,
        hasSDP: !!answer.sdp,
        currentRoom: this.currentRoom,
        currentCallId: this.callId,
        isInitiator: this.isInitiator,
        isCallActive: this.isCallActive,
      });

      // Check if we should process answer
      if (this._isEndingCall || !this.isCallActive) {
        this.logger.warn("Call is ending or not active, ignoring answer");
        this.logger.groupEnd();
        this._pendingOperations.delete(operationId);
        return;
      }

      await this.peerManager.handleAnswer(answer);

      // Start call timer when answer is processed
      if (this.isInitiator) {
        this.logger.log(
          "Initiator: answer received, connection should be established"
        );
        this.isCallActive = true;
        this.eventManager.emit("callConnected");
      }

      this.logger.groupEnd();
      this._pendingOperations.delete(operationId);
    } catch (error) {
      this.logger.error("handleAnswer", error);
      this.logger.groupEnd();
      this._pendingOperations.delete(operationId);
      throw error;
    }
  }

  /**
   * Add ICE candidate - FIXED: Thêm state check
   */
  async addIceCandidate(candidate) {
    if (this._isEndingCall || !this.peerManager.hasPeerConnection()) {
      this.logger.warn(
        "Cannot add ICE candidate - call ending or no connection"
      );
      return;
    }

    return this.peerManager.addIceCandidate(candidate);
  }

  /**
   * End the call - FIXED: Thêm lock để tránh đệ quy
   */
  async endCall() {
    const operationId = `end_${Date.now()}`;

    // Kiểm tra nếu đang trong quá trình end
    if (this._isEndingCall) {
      this.logger.log("endCall already in progress, skipping");
      return;
    }

    this._isEndingCall = true;
    this._pendingOperations.add(operationId);

    this.logger.group("📴 endCall()");
    try {
      this.logger.log("Ending call...", {
        currentRoom: this.currentRoom,
        roomId: this.roomId,
        isCallActive: this.isCallActive,
        callId: this.callId,
        pendingOperations: this._pendingOperations.size,
      });

      this.isCallActive = false;
      this._microphoneMuted = false;

      // Send socket event if valid callId
      if (
        this.socket?.connected &&
        this.roomId &&
        !this.callId?.startsWith?.("temp_")
      ) {
        this.signalingManager.sendCallEnded();
      } else if (this.callId?.startsWith?.("temp_")) {
        this.logger.log("Skipping socket emit for temp callId");
      }

      // Cleanup all managers
      await this.peerManager.cleanup();
      await this.mediaManager.cleanup();

      // Reset state nhưng giữ currentRoom cho tracking
      this.resetState();

      // Không reset currentRoom ở đây để tránh race condition
      // currentRoom sẽ được reset khi initialize mới

      this.eventManager.emit("callEnded");
      this.logger.success("Call ended successfully", {
        currentRoomAfterEnd: this.currentRoom,
        pendingOperations: this._pendingOperations.size,
      });
      this.logger.groupEnd();
    } catch (error) {
      this.logger.error("endCall", error);
      this.logger.groupEnd();
    } finally {
      this._isEndingCall = false;
      this._pendingOperations.delete(operationId);
    }
  }

  /**
   * Reset for new connection - FIXED: Tối ưu logic reset
   */
  async resetForNewConnection(newRoomId) {
    this.logger.log(`Resetting for new room: ${newRoomId}`, {
      currentRoom: this.currentRoom,
      isCallActive: this.isCallActive,
      isEnding: this._isEndingCall,
      pendingOperations: this._pendingOperations.size,
    });

    // Only end call if different room và đang active
    if (
      this.peerManager.hasPeerConnection() &&
      this.currentRoom &&
      this.currentRoom !== newRoomId &&
      !this._isEndingCall
    ) {
      await this.endCall();
    } else if (this.currentRoom === newRoomId) {
      this.logger.log("Same room, no need to end call");
    }

    // Reset state nhưng không reset currentRoom ở đây
    // currentRoom sẽ được set trong initialize
    this.resetState();
    this.logger.success("Reset completed");
  }

  /**
   * Toggle microphone - FIXED: Thêm state check và event emission
   */
  toggleMicrophone(mute) {
    this.logger.group(`🔇 WebRTCService.toggleMicrophone(${mute})`);

    try {
      // Kiểm tra nhiều trạng thái hơn
      const connectionState = this.peerManager.getConnectionState();
      const signalingState = this.peerManager.getSignalingState();

      const isActive =
        this.isCallActive ||
        connectionState === "connected" ||
        (signalingState === "stable" && connectionState !== "failed") ||
        this.mediaManager.hasLocalStream();

      if (!isActive || this._isEndingCall || this._cleanupInProgress) {
        this.logger.warn("Cannot toggle microphone", {
          isCallActive: this.isCallActive,
          connectionState: connectionState,
          signalingState: signalingState,
          isEnding: this._isEndingCall,
          cleanupInProgress: this._cleanupInProgress,
          hasLocalStream: this.mediaManager.hasLocalStream(),
          isActive,
        });
        this.logger.groupEnd();
        return false;
      }

      const previousMutedState = this._microphoneMuted;

      // Gọi MediaStreamManager và emit event
      const result = this.mediaManager.toggleMicrophone(mute);

      if (result) {
        // Cập nhật internal state
        this._microphoneMuted = mute;

        // Emit event khi thành công
        this.eventManager.emit("microphoneToggled", {
          muted: mute,
          previousMuted: previousMutedState,
          timestamp: Date.now(),
          userId: this.userId,
          success: true,
        });

        this.logger.success(
          `Microphone ${mute ? "muted" : "unmuted"} successfully`
        );
      } else {
        this.logger.warn("toggleMicrophone returned false");
        this.eventManager.emit("microphoneToggled", {
          muted: previousMutedState,
          previousMuted: previousMutedState,
          timestamp: Date.now(),
          userId: this.userId,
          success: false,
          error: "Failed to toggle microphone",
        });
      }

      this.logger.groupEnd();
      return result;
    } catch (error) {
      this.logger.error("toggleMicrophone", error);
      this.eventManager.emit("microphoneToggled", {
        muted: this._microphoneMuted,
        previousMuted: this._microphoneMuted,
        timestamp: Date.now(),
        userId: this.userId,
        success: false,
        error: error.message,
      });
      this.logger.groupEnd();
      return false;
    }
  }

  /**
   * Toggle microphone (alternating)
   */
  toggleMicrophone() {
    return this.toggleMicrophone(!this._microphoneMuted);
  }

  /**
   * Get microphone status
   */
  getMicrophoneStatus() {
    const mediaStatus = this.mediaManager.getMicrophoneStatus();
    return {
      ...mediaStatus,
      serviceMuted: this._microphoneMuted,
      canToggle: this.isCallActive && !this._isEndingCall,
    };
  }

  /**
   * Check if microphone is muted
   */
  isMicrophoneMuted() {
    return this._microphoneMuted || this.mediaManager.isMicrophoneMuted();
  }

  /**
   * Check if busy - FIXED: Cải thiện logic
   */
  isBusy() {
    if (this._isEndingCall || this._cleanupInProgress) {
      return true;
    }

    if (!this.peerManager.hasPeerConnection()) {
      return false;
    }

    const state = this.peerManager.getSignalingState();
    const busy =
      state === "have-local-offer" ||
      state === "have-remote-offer" ||
      state === "have-local-pranswer" ||
      state === "have-remote-pranswer";

    this.logger.log(`Signaling state: ${state}, busy: ${busy}`);
    return busy;
  }

  /**
   * Get call info - FIXED: Thêm thông tin state management
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
      peerConnectionState: this.peerManager.getConnectionState(),
      signalingState: this.peerManager.getSignalingState(),
      isEnding: this._isEndingCall,
      pendingOperations: this._pendingOperations.size,
      isInitializing: this._isInitializing,
      microphoneMuted: this._microphoneMuted,
      microphoneStatus: this.getMicrophoneStatus(),
    };

    this.logger.log("Call information", info);
    return info;
  }

  /**
   * Get call data for Redux - FIXED: Thêm state flags
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
      isInitiator: this.isInitiator,
      isActive: this.isCallActive,
      isEnding: this._isEndingCall,
      microphoneMuted: this._microphoneMuted,
    };

    this.logger.log("Generated call data", callData);
    return callData;
  }

  /**
   * Event handling methods
   */
  on(event, handler) {
    return this.eventManager.on(event, handler);
  }

  off(event, handler) {
    return this.eventManager.off(event, handler);
  }

  removeAllListeners() {
    return this.eventManager.removeAllListeners();
  }

  /**
   * Debug function - FIXED: Thêm thông tin state management
   */
  debug() {
    this.logger.group("🔍 WebRTC Service Debug");

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
      isEnding: this._isEndingCall,
      isInitializing: this._isInitializing,
      cleanupInProgress: this._cleanupInProgress,
      microphoneMuted: this._microphoneMuted,
      pendingOperations: Array.from(this._pendingOperations),
    });

    this.peerManager.debug();
    this.mediaManager.debug();
    this.eventManager.debug();

    this.logger.groupEnd();
  }

  /**
   * Check if has active room - FIXED: Cải thiện logic
   */
  hasActiveRoom() {
    const hasRoom =
      !!this.currentRoom && this.isCallActive && !this._isEndingCall;
    this.logger.log(`Has active room: ${hasRoom}`, {
      currentRoom: this.currentRoom,
      isCallActive: this.isCallActive,
      isEnding: this._isEndingCall,
    });
    return hasRoom;
  }

  /**
   * Check if can start for new room - FIXED: Cải thiện logic
   */
  canStartForRoom(roomId) {
    if (this._isEndingCall || this._cleanupInProgress) {
      this.logger.log(
        `Cannot start for room ${roomId} - ending or cleaning up`
      );
      return false;
    }

    const canStart = !this.currentRoom || this.currentRoom === roomId;
    this.logger.log(`Can start for room ${roomId}: ${canStart}`, {
      currentRoom: this.currentRoom,
      newRoomId: roomId,
      isCallActive: this.isCallActive,
      isEnding: this._isEndingCall,
    });
    return canStart;
  }

  /**
   * Quick log method
   */
  quickLog(message, data = null) {
    this.logger.log(message, data);
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Reset all state - FIXED: Giữ currentRoom cho tracking
   */
  resetState() {
    this._cleanupInProgress = true;

    try {
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
      this._microphoneMuted = false;
      // KHÔNG reset currentRoom ở đây - để tracking

      this._isInitializing = false;
      this._pendingOperations.clear();
    } finally {
      this._cleanupInProgress = false;
    }
  }

  /**
   * Wait for pending operations - FIXED: Utility method
   */
  async waitForPendingOperations(timeout = 5000) {
    const startTime = Date.now();

    while (
      this._pendingOperations.size > 0 &&
      Date.now() - startTime < timeout
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (this._pendingOperations.size > 0) {
      this.logger.warn(
        `Timeout waiting for ${this._pendingOperations.size} pending operations`
      );
    }
  }
}

export default WebRTCService;
