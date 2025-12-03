import Logger from "./Logger.js";

class EventManager {
  constructor(service) {
    this.service = service;
    this.logger = new Logger("EventManager");

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
  }

  // ==================== CORE METHODS ====================

  /**
   * Add event handler
   */
  on(event, handler) {
    this.logger.log(`Adding handler for event: ${event}`);

    if (this.eventHandlers[event]) {
      this.eventHandlers[event].push(handler);
    } else {
      this.logger.warn(`Unknown event: ${event}`);
    }
  }

  /**
   * Remove event handler
   */
  off(event, handler) {
    this.logger.log(`Removing handler for event: ${event}`);

    if (this.eventHandlers[event]) {
      const index = this.eventHandlers[event].indexOf(handler);
      if (index > -1) {
        this.eventHandlers[event].splice(index, 1);
      }
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    this.logger.log("Removing all event handlers");

    Object.keys(this.eventHandlers).forEach((event) => {
      this.eventHandlers[event] = [];
    });
  }

  /**
   * Emit event to all handlers
   */
  emit(event, data) {
    this.logger.log(
      `Emitting ${event} to ${this.eventHandlers[event]?.length || 0} handlers`
    );

    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(error, { event, data });
        }
      });
    }
  }

  // ==================== DEBUG ====================

  debug() {
    console.log(
      "Event Handlers:",
      Object.keys(this.eventHandlers).reduce((acc, key) => {
        acc[key] = this.eventHandlers[key].length;
        return acc;
      }, {})
    );
  }
}

export default EventManager;
