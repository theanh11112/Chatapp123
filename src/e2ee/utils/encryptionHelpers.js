/**
 * Encryption Utility Functions
 * Message processing, error handling, session management, and formatting
 */

class EncryptionHelpers {
  constructor() {
    this.messageCache = new Map();
    this.sessionCache = new Map();
    this.errorLog = [];
    this.maxErrorLogSize = 100;

    console.log("🛠️ [EncryptionHelpers] Initialized");
  }

  // ======================= MESSAGE PROCESSING =======================

  prepareMessageForEncryption(content, metadata = {}) {
    try {
      const messagePackage = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        content: content,
        metadata: {
          ...metadata,
          contentType: typeof content === "string" ? "text" : "binary",
          contentLength:
            typeof content === "string" ? content.length : content.byteLength,
          messageId: this.generateMessageId(),
        },
      };

      const messageString =
        typeof content === "string" ? JSON.stringify(messagePackage) : content;

      // Cache for reference
      const cacheKey = `msg_${messagePackage.metadata.messageId}`;
      this.messageCache.set(cacheKey, {
        data: messagePackage,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000, // 5 minutes
      });

      return messageString;
    } catch (error) {
      this.handleError(error, "prepareMessageForEncryption", {
        contentLength: content?.length,
      });
      throw error;
    }
  }

  parseEncryptedMessage(encryptedData, isString = true) {
    try {
      if (!encryptedData) {
        throw new Error("No encrypted data provided");
      }

      let parsedData;

      if (isString) {
        try {
          parsedData = JSON.parse(encryptedData);
        } catch (e) {
          // Not JSON, treat as plain text
          parsedData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            content: encryptedData,
            metadata: {
              contentType: "text",
              contentLength: encryptedData.length,
              messageId: this.generateMessageId(),
            },
          };
        }
      } else {
        parsedData = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          content: encryptedData,
          metadata: {
            contentType: "binary",
            contentLength: encryptedData.byteLength,
            messageId: this.generateMessageId(),
          },
        };
      }

      if (!parsedData.content) {
        throw new Error("Invalid message structure: missing content");
      }

      return parsedData;
    } catch (error) {
      this.handleError(error, "parseEncryptedMessage", { isString });
      throw error;
    }
  }

  extractEncryptionMetadata(encryptedMessage) {
    try {
      const metadata = {
        algorithm: encryptedMessage.algorithm || "unknown",
        keyId: encryptedMessage.keyId || null,
        iv: encryptedMessage.iv || null,
        ciphertext: !!encryptedMessage.ciphertext,
        isEncrypted: !!encryptedMessage.ciphertext,
        timestamp: encryptedMessage.timestamp || new Date().toISOString(),
      };

      if (encryptedMessage.ciphertext) {
        metadata.encryptedSize =
          typeof encryptedMessage.ciphertext === "string"
            ? encryptedMessage.ciphertext.length
            : encryptedMessage.ciphertext.byteLength;
      }

      return metadata;
    } catch (error) {
      this.handleError(error, "extractEncryptionMetadata");
      return {
        algorithm: "unknown",
        isEncrypted: false,
        error: error.message,
      };
    }
  }

  // ======================= SESSION MANAGEMENT =======================

  createEncryptionSession(peerId, sessionData) {
    try {
      const sessionId = `session_${peerId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const session = {
        sessionId,
        peerId,
        algorithm: sessionData.algorithm || "AES-GCM",
        keyType: sessionData.keyType || "shared",
        createdAt: new Date().toISOString(),
        messageCount: 0,
        lastUsed: new Date().toISOString(),
        isActive: true,
        metadata: sessionData.metadata || {},
      };

      this.sessionCache.set(sessionId, session);

      // Persist to localStorage
      this.persistSession(session);

      return session;
    } catch (error) {
      this.handleError(error, "createEncryptionSession", { peerId });
      throw error;
    }
  }

  getSession(sessionId) {
    return this.sessionCache.get(sessionId);
  }

  getActiveSessions() {
    const activeSessions = {};

    for (const [sessionId, session] of this.sessionCache.entries()) {
      if (session.isActive) {
        activeSessions[sessionId] = session;
      }
    }

    return activeSessions;
  }

  updateSessionUsage(sessionId) {
    try {
      const session = this.sessionCache.get(sessionId);
      if (session) {
        session.lastUsed = new Date().toISOString();
        session.messageCount = (session.messageCount || 0) + 1;

        this.sessionCache.set(sessionId, session);
        this.persistSession(session);

        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, "updateSessionUsage", { sessionId });
      return false;
    }
  }

  closeSession(sessionId) {
    try {
      const session = this.sessionCache.get(sessionId);
      if (session) {
        session.isActive = false;
        session.closedAt = new Date().toISOString();

        this.sessionCache.set(sessionId, session);
        this.persistSession(session);

        return true;
      }
      return false;
    } catch (error) {
      this.handleError(error, "closeSession", { sessionId });
      return false;
    }
  }

  cleanupOldSessions(maxAgeHours = 24) {
    try {
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, session] of this.sessionCache.entries()) {
        const lastUsed = new Date(session.lastUsed);
        const hoursSinceLastUse = (now - lastUsed) / (1000 * 60 * 60);

        if (hoursSinceLastUse > maxAgeHours) {
          this.sessionCache.delete(sessionId);
          cleanedCount++;
        }
      }

      // Cleanup persisted sessions
      this.cleanupPersistedSessions(maxAgeHours);

      return cleanedCount;
    } catch (error) {
      this.handleError(error, "cleanupOldSessions", { maxAgeHours });
      return 0;
    }
  }

  // ======================= ERROR HANDLING =======================

  handleError(error, context = {}, additionalData = {}) {
    try {
      const errorInfo = {
        timestamp: new Date().toISOString(),
        errorType: error.name,
        errorMessage: error.message,
        context,
        additionalData,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        stack: error.stack?.substring(0, 500), // Limit stack trace size
      };

      // Add to memory log
      this.errorLog.unshift(errorInfo);
      if (this.errorLog.length > this.maxErrorLogSize) {
        this.errorLog.length = this.maxErrorLogSize;
      }

      // Persist to localStorage
      this.persistError(errorInfo);

      // Categorize error
      const category = this.categorizeError(error);

      console.error(`🚨 [EncryptionHelpers] ${category}:`, {
        context,
        error: error.message,
      });

      return {
        category,
        errorId: this.generateErrorId(errorInfo),
        timestamp: errorInfo.timestamp,
      };
    } catch (logError) {
      console.error("❌ Error logging failed:", logError);
      return { category: "logging_failed" };
    }
  }

  categorizeError(error) {
    const message = error.message.toLowerCase();

    if (message.includes("key") || message.includes("cryptokey")) {
      return "key_error";
    } else if (message.includes("password") || message.includes("auth")) {
      return "authentication_error";
    } else if (
      message.includes("algorithm") ||
      message.includes("unsupported")
    ) {
      return "algorithm_error";
    } else if (message.includes("network") || message.includes("socket")) {
      return "network_error";
    } else if (
      message.includes("storage") ||
      message.includes("localstorage")
    ) {
      return "storage_error";
    } else if (message.includes("type") || message.includes("format")) {
      return "data_format_error";
    } else if (message.includes("timeout") || message.includes("expired")) {
      return "timeout_error";
    } else if (message.includes("permission") || message.includes("security")) {
      return "security_error";
    } else {
      return "unknown_error";
    }
  }

  getErrorSuggestions(category) {
    const suggestions = {
      key_error: [
        "Regenerate your encryption keys",
        "Clear browser cache and reload",
        "Check if the recipient has E2EE enabled",
      ],
      authentication_error: [
        "Re-enter your encryption password",
        "Reset your encryption keys if password is lost",
      ],
      algorithm_error: [
        "Update your browser to the latest version",
        "Try using a different browser",
      ],
      network_error: [
        "Check your internet connection",
        "Try switching between WiFi and mobile data",
      ],
      storage_error: [
        "Clear browser storage for this site",
        "Use incognito mode temporarily",
      ],
      data_format_error: [
        "Refresh the page and try again",
        "Clear browser cache",
      ],
      timeout_error: [
        "Wait a moment and try again",
        "Close other tabs/applications",
      ],
      security_error: [
        "Check browser security settings",
        "Enable cookies and local storage",
      ],
      unknown_error: [
        "Refresh the application",
        "Clear browser data for this site",
        "Contact technical support",
      ],
    };

    return suggestions[category] || suggestions.unknown_error;
  }

  getErrorLog(limit = 20) {
    return this.errorLog.slice(0, limit);
  }

  clearErrorLog() {
    this.errorLog = [];
    localStorage.removeItem("e2ee_error_log");
    return true;
  }

  // ======================= UTILITY FUNCTIONS =======================

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateErrorId(errorInfo) {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  validateMessageStructure(message) {
    try {
      const requiredFields = ["content", "timestamp"];
      const missingFields = requiredFields.filter((field) => !message[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      const timestamp = new Date(message.timestamp);
      if (isNaN(timestamp.getTime())) {
        throw new Error("Invalid timestamp");
      }

      if (
        typeof message.content !== "string" &&
        !(message.content instanceof ArrayBuffer)
      ) {
        throw new Error("Content must be string or ArrayBuffer");
      }

      return {
        isValid: true,
        contentType: typeof message.content === "string" ? "text" : "binary",
        contentLength:
          typeof message.content === "string"
            ? message.content.length
            : message.content.byteLength,
      };
    } catch (error) {
      this.handleError(error, "validateMessageStructure");
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  formatEncryptionInfo(encryptionData) {
    try {
      return {
        algorithm: encryptionData.algorithm || "AES-GCM",
        keyId: encryptionData.keyId
          ? `${encryptionData.keyId.substring(0, 8)}...`
          : "unknown",
        iv: encryptionData.iv
          ? `${encryptionData.iv.substring(0, 8)}...`
          : "none",
        timestamp: encryptionData.timestamp || new Date().toISOString(),
        size: encryptionData.ciphertext
          ? typeof encryptionData.ciphertext === "string"
            ? encryptionData.ciphertext.length
            : encryptionData.ciphertext.byteLength
          : 0,
        peerId: encryptionData.peerId || "unknown",
      };
    } catch (error) {
      this.handleError(error, "formatEncryptionInfo");
      return {
        algorithm: "unknown",
        keyId: "error",
        iv: "error",
        timestamp: new Date().toISOString(),
        size: 0,
      };
    }
  }

  // ======================= PERSISTENCE HELPERS =======================

  persistSession(session) {
    try {
      const sessions = JSON.parse(
        localStorage.getItem("e2ee_sessions") || "{}"
      );
      sessions[session.sessionId] = session;
      localStorage.setItem("e2ee_sessions", JSON.stringify(sessions));
    } catch (error) {
      console.warn("⚠️ Failed to persist session:", error);
    }
  }

  cleanupPersistedSessions(maxAgeHours) {
    try {
      const sessions = JSON.parse(
        localStorage.getItem("e2ee_sessions") || "{}"
      );
      const now = new Date();
      const cleanedSessions = {};

      for (const [sessionId, session] of Object.entries(sessions)) {
        const lastUsed = new Date(session.lastUsed);
        const hoursSinceLastUse = (now - lastUsed) / (1000 * 60 * 60);

        if (hoursSinceLastUse <= maxAgeHours && session.isActive !== false) {
          cleanedSessions[sessionId] = session;
        }
      }

      localStorage.setItem("e2ee_sessions", JSON.stringify(cleanedSessions));
    } catch (error) {
      console.warn("⚠️ Failed to cleanup persisted sessions:", error);
    }
  }

  persistError(errorInfo) {
    try {
      const errorLog = JSON.parse(
        localStorage.getItem("e2ee_error_log") || "[]"
      );
      errorLog.unshift(errorInfo);

      if (errorLog.length > this.maxErrorLogSize) {
        errorLog.length = this.maxErrorLogSize;
      }

      localStorage.setItem("e2ee_error_log", JSON.stringify(errorLog));
    } catch (error) {
      console.warn("⚠️ Failed to persist error:", error);
    }
  }

  // ======================= DEBUG =======================

  debugInfo() {
    console.group("🔍 [EncryptionHelpers] Debug Info");
    console.log("📊 Message cache size:", this.messageCache.size);
    console.log("📊 Session cache size:", this.sessionCache.size);
    console.log("📊 Error log size:", this.errorLog.length);

    console.log("🔄 Active sessions:");
    const activeSessions = this.getActiveSessions();
    Object.keys(activeSessions).forEach((sessionId) => {
      const session = activeSessions[sessionId];
      console.log(`   ${sessionId}:`, {
        peerId: session.peerId,
        messageCount: session.messageCount,
        lastUsed: session.lastUsed,
      });
    });

    console.groupEnd();
  }
}

// Singleton instance
const encryptionHelpers = new EncryptionHelpers();

// Export helper functions
export const prepareMessage = (content, metadata) =>
  encryptionHelpers.prepareMessageForEncryption(content, metadata);
export const parseMessage = (encryptedData, isString) =>
  encryptionHelpers.parseEncryptedMessage(encryptedData, isString);
export const extractMetadata = (encryptedMessage) =>
  encryptionHelpers.extractEncryptionMetadata(encryptedMessage);
export const handleEncryptionError = (error, context, data) =>
  encryptionHelpers.handleError(error, context, data);
export const getErrorSuggestions = (category) =>
  encryptionHelpers.getErrorSuggestions(category);
export const validateMessage = (message) =>
  encryptionHelpers.validateMessageStructure(message);
export const formatEncryptionData = (encryptionData) =>
  encryptionHelpers.formatEncryptionInfo(encryptionData);

export default encryptionHelpers;
