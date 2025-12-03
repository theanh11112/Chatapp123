class TrackManager {
  constructor() {
    this.addedTrackIds = new Set();
    this.registeredTracks = new Map();
  }

  // ==================== CORE METHODS ====================

  /**
   * Register stream and its tracks
   */
  registerStream(stream) {
    if (!stream) return;

    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      this.registeredTracks.set(track.id, {
        track,
        stream,
        kind: track.kind,
        enabled: track.enabled,
      });
    });
  }

  /**
   * Add tracks to peer connection
   */
  async addTracksToConnection(peerConnection, stream, isVideoCall = false) {
    if (!peerConnection || !stream) {
      return 0;
    }

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();
    let tracksAdded = 0;

    // Add audio tracks
    audioTracks.forEach((track) => {
      if (!this.addedTrackIds.has(track.id)) {
        try {
          peerConnection.addTrack(track, stream);
          this.addedTrackIds.add(track.id);
          tracksAdded++;
        } catch (trackError) {
          console.error(`Failed to add audio track: ${trackError.message}`);
        }
      }
    });

    // Add video tracks if video call
    if (isVideoCall) {
      videoTracks.forEach((track) => {
        if (!this.addedTrackIds.has(track.id)) {
          try {
            peerConnection.addTrack(track, stream);
            this.addedTrackIds.add(track.id);
            tracksAdded++;
          } catch (trackError) {
            console.error(`Failed to add video track: ${trackError.message}`);
          }
        }
      });
    }

    return tracksAdded;
  }

  /**
   * Remove track from peer connection
   */
  removeTrack(trackId) {
    if (this.addedTrackIds.has(trackId)) {
      this.addedTrackIds.delete(trackId);
      return true;
    }
    return false;
  }

  /**
   * Check if track is already added
   */
  isTrackAdded(trackId) {
    return this.addedTrackIds.has(trackId);
  }

  /**
   * Get all added track IDs
   */
  getAddedTrackIds() {
    return Array.from(this.addedTrackIds);
  }

  /**
   * Get track info by ID
   */
  getTrackInfo(trackId) {
    return this.registeredTracks.get(trackId);
  }

  /**
   * Reset all track tracking
   */
  reset() {
    this.addedTrackIds.clear();
    this.registeredTracks.clear();
  }

  /**
   * Get info for debugging
   */
  getInfo() {
    return {
      addedTrackCount: this.addedTrackIds.size,
      registeredTrackCount: this.registeredTracks.size,
      addedTrackIds: Array.from(this.addedTrackIds),
    };
  }
}

export default TrackManager;
