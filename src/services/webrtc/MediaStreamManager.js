import Logger from "./Logger.js";
import TrackManager from "./utils/TrackManager.js";

class MediaStreamManager {
  constructor(service) {
    this.service = service;
    this.logger = new Logger("MediaStreamManager");

    this.localStream = null;
    this.remoteStream = null;
    this.trackManager = new TrackManager();
  }

  // ==================== CORE METHODS ====================

  /**
   * Get local media stream
   */
  async getLocalMediaStream() {
    this.logger.group("🎤 getLocalMediaStream()");
    try {
      this.logger.log("Requesting media stream", {
        isVideoCall: this.service.isVideoCall,
      });

      // Check navigator.mediaDevices
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
        video: this.service.isVideoCall
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 24 },
              facingMode: "user",
            }
          : false,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      this.logger.success("Media stream obtained", {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        audioEnabled: this.localStream.getAudioTracks()[0]?.enabled,
        videoEnabled: this.localStream.getVideoTracks()[0]?.enabled,
        streamId: this.localStream.id,
      });

      // Setup track ended handlers
      this.setupTrackEndedHandlers();

      // Register tracks with track manager
      this.trackManager.registerStream(this.localStream);

      this.service.eventManager.emit("localStream", this.localStream);
      this.logger.groupEnd();
      return this.localStream;
    } catch (mediaError) {
      this.logger.error("getLocalMediaStream", mediaError);

      if (mediaError.name === "NotAllowedError") {
        this.logger.groupEnd();
        throw new Error(
          "Microphone/camera access denied. Please allow access in browser settings."
        );
      } else if (mediaError.name === "NotFoundError") {
        this.logger.groupEnd();
        throw new Error(
          "No microphone/camera found. Please check your devices."
        );
      } else {
        this.logger.groupEnd();
        throw mediaError;
      }
    }
  }

  /**
   * Setup track ended handlers for local stream
   */
  setupTrackEndedHandlers() {
    this.logger.log("Setting up track ended handlers");

    if (!this.localStream) {
      this.logger.log("No local stream available");
      return;
    }

    const tracks = this.localStream.getTracks();
    tracks.forEach((track) => {
      const originalOnEnded = track.onended;
      track.onended = (event) => {
        this.logger.log(`Track ended: ${track.kind}`, {
          trackId: track.id,
          enabled: track.enabled,
          muted: track.muted,
        });

        this.service.eventManager.emit("trackEnded", {
          track: track,
          kind: track.kind,
          event: event,
        });

        // Call original handler if exists
        if (typeof originalOnEnded === "function") {
          originalOnEnded(event);
        }

        // If audio track ended and we're in a call, end the call
        if (track.kind === "audio" && this.service.isCallActive) {
          this.logger.log("Audio track ended, ending call");
          this.service
            .endCall()
            .catch((error) => this.logger.error("track.onended", error));
        }
      };
    });

    this.logger.success(`Setup handlers for ${tracks.length} tracks`);
  }

  /**
   * Toggle microphone
   */
  toggleMicrophone(mute) {
    this.logger.group(`🔇 toggleMicrophone(${mute})`);

    try {
      this.logger.log(mute ? "Muting microphone" : "Unmuting microphone", {
        hasLocalStream: !!this.localStream,
        currentRoom: this.service.currentRoom,
        streamActive: this.localStream?.active,
      });

      if (!this.localStream || !this.localStream.active) {
        this.logger.warn("No active local stream available");
        this.logger.groupEnd();
        return false;
      }

      const audioTracks = this.localStream.getAudioTracks();

      if (audioTracks.length === 0) {
        this.logger.warn("No audio tracks found in local stream");
        this.logger.groupEnd();
        return false;
      }

      let successCount = 0;
      audioTracks.forEach((track, index) => {
        if (track.readyState === "ended") {
          this.logger.warn(`Audio track ${index} has ended, skipping`);
          return;
        }

        const previousState = track.enabled;
        track.enabled = !mute;

        if (track.enabled !== previousState) {
          successCount++;
          this.logger.log(`Track ${index}: ${mute ? "muted" : "unmuted"}`, {
            trackId: track.id,
            kind: track.kind,
            enabled: track.enabled,
            previousState,
          });
        } else {
          this.logger.log(
            `Track ${index}: already ${mute ? "muted" : "unmuted"}`,
            {
              trackId: track.id,
              enabled: track.enabled,
            }
          );
        }
      });

      const success = successCount > 0;
      if (success) {
        this.logger.success(
          `Microphone ${mute ? "muted" : "unmuted"} (${successCount} tracks)`
        );
      } else {
        this.logger.log("No changes made to audio tracks");
      }

      this.logger.groupEnd();
      return success;
    } catch (error) {
      this.logger.error("toggleMicrophone", error);
      this.logger.groupEnd();
      return false;
    }
  }

  /**
   * Check if microphone is muted
   */
  isMicrophoneMuted() {
    if (!this.localStream || !this.localStream.active) {
      return true;
    }

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      return true;
    }

    // Return true if ALL audio tracks are disabled
    return audioTracks.every((track) => !track.enabled);
  }

  /**
   * Get microphone status
   */
  getMicrophoneStatus() {
    if (!this.localStream) {
      return {
        available: false,
        muted: true,
        tracks: 0,
        hasAudio: false,
        streamActive: false,
      };
    }

    const audioTracks = this.localStream.getAudioTracks();
    const muted =
      audioTracks.length === 0 || audioTracks.every((track) => !track.enabled);

    return {
      available: audioTracks.length > 0,
      muted,
      tracks: audioTracks.length,
      hasAudio: audioTracks.length > 0,
      streamActive: this.localStream.active,
      activeTracks: audioTracks.filter((t) => t.enabled).length,
    };
  }

  /**
   * Get audio track info
   */
  getAudioTrackInfo() {
    if (!this.localStream) return null;

    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return null;

    const track = audioTracks[0];
    return {
      id: track.id,
      enabled: track.enabled,
      readyState: track.readyState,
      kind: track.kind,
      label: track.label || "Unknown",
      muted: track.muted,
    };
  }

  /**
   * Set remote stream
   */
  setRemoteStream(stream) {
    this.remoteStream = stream;
    this.logger.log("Remote stream set", {
      streamId: stream.id,
      active: stream.active,
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length,
    });

    this.service.eventManager.emit("remoteStreamUpdated", stream);
  }

  /**
   * Cleanup media streams
   */
  async cleanup() {
    this.logger.group("🧹 MediaStreamManager.cleanup()");
    try {
      // Stop local stream tracks
      if (this.localStream) {
        try {
          const tracks = this.localStream.getTracks();
          this.logger.log(`Stopping ${tracks.length} local tracks`);

          tracks.forEach((track, index) => {
            try {
              track.stop();
              track.enabled = false;
              this.logger.log(`Stopped track ${index}`, {
                kind: track.kind,
                id: track.id,
              });
            } catch (trackError) {
              this.logger.error(`Error stopping track ${index}`, trackError);
            }
          });
          this.logger.success("Local stream tracks stopped");
        } catch (streamError) {
          this.logger.error("Error stopping local stream", streamError);
        }
        this.localStream = null;
      }

      // Clear remote stream
      if (this.remoteStream) {
        try {
          const tracks = this.remoteStream.getTracks();
          this.logger.log(`Stopping ${tracks.length} remote tracks`);

          tracks.forEach((track) => {
            try {
              track.stop();
            } catch (error) {
              // Ignore errors on remote tracks
            }
          });
          this.logger.success("Remote stream cleared");
        } catch (error) {
          this.logger.error("Error clearing remote stream", error);
        }
        this.remoteStream = null;
      }

      // Reset track manager
      this.trackManager.reset();

      this.service.eventManager.emit("mediaCleanupCompleted");
      this.logger.success("Media cleanup completed");
    } catch (error) {
      this.logger.error("cleanup", error);
      throw error;
    } finally {
      this.logger.groupEnd();
    }
  }

  // ==================== GETTERS ====================

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  hasLocalStream() {
    return !!this.localStream && this.localStream.active;
  }

  hasAudioTracks() {
    return this.localStream && this.localStream.getAudioTracks().length > 0;
  }

  // ==================== DEBUG ====================

  debug() {
    console.group("🔍 MediaStreamManager Debug");

    console.log(
      "Local Stream:",
      this.localStream
        ? {
            id: this.localStream.id,
            active: this.localStream.active,
            audioTracks: this.localStream.getAudioTracks().length,
            videoTracks: this.localStream.getVideoTracks().length,
            audioEnabled: this.localStream.getAudioTracks()[0]?.enabled,
            videoEnabled: this.localStream.getVideoTracks()[0]?.enabled,
          }
        : null
    );

    console.log(
      "Remote Stream:",
      this.remoteStream
        ? {
            id: this.remoteStream.id,
            active: this.remoteStream.active,
            audioTracks: this.remoteStream.getAudioTracks().length,
            videoTracks: this.remoteStream.getVideoTracks().length,
          }
        : null
    );

    console.log("Microphone Status:", this.getMicrophoneStatus());
    console.log("Audio Track Info:", this.getAudioTrackInfo());
    console.log("Track Manager:", this.trackManager.getInfo());

    console.groupEnd();
  }
}

export default MediaStreamManager;
