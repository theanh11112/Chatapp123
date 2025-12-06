class EncryptionHelpers {
  constructor() {
    console.log("🔐 [EncryptionHelpers] Initialized");
  }

  // 📨 MESSAGE PROCESSING

  prepareMessageForEncryption(content, metadata = {}) {
    try {
      console.log("📨 [EncryptionHelpers] Preparing message for encryption...");

      const messagePackage = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        content: content,
        metadata: {
          ...metadata,
          contentType: typeof content === "string" ? "text" : "binary",
          contentLength:
            typeof content === "string" ? content.length : content.byteLength,
        },
      };

      // Stringify if not already a string
      const messageString =
        typeof content === "string" ? JSON.stringify(messagePackage) : content;

      console.log("✅ [EncryptionHelpers] Message prepared:", {
        contentType: messagePackage.metadata.contentType,
        contentLength: messagePackage.metadata.contentLength,
      });

      return messageString;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error preparing message:", error);
      throw error;
    }
  }

  parseEncryptedMessage(encryptedData, isString = true) {
    try {
      console.log("📨 [EncryptionHelpers] Parsing encrypted message...");

      if (!encryptedData) {
        throw new Error("No encrypted data provided");
      }

      let parsedData;

      if (isString) {
        // Try to parse as JSON
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
            },
          };
        }
      } else {
        // Binary data
        parsedData = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          content: encryptedData,
          metadata: {
            contentType: "binary",
            contentLength: encryptedData.byteLength,
          },
        };
      }

      // Validate structure
      if (!parsedData.content) {
        throw new Error("Invalid message structure: missing content");
      }

      console.log("✅ [EncryptionHelpers] Message parsed:", {
        version: parsedData.version,
        contentType: parsedData.metadata?.contentType,
        contentLength: parsedData.metadata?.contentLength,
      });

      return parsedData;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error parsing message:", error);
      throw error;
    }
  }

  extractEncryptionMetadata(encryptedMessage) {
    try {
      console.log("🔍 [EncryptionHelpers] Extracting encryption metadata...");

      const metadata = {
        algorithm: encryptedMessage.algorithm || "unknown",
        keyId: encryptedMessage.keyId || null,
        iv: encryptedMessage.iv || null,
        ciphertext: !!encryptedMessage.ciphertext,
        isEncrypted: !!encryptedMessage.ciphertext,
        timestamp: encryptedMessage.timestamp || new Date().toISOString(),
      };

      // Calculate size
      if (encryptedMessage.ciphertext) {
        metadata.encryptedSize =
          typeof encryptedMessage.ciphertext === "string"
            ? encryptedMessage.ciphertext.length
            : encryptedMessage.ciphertext.byteLength;
      }

      console.log("✅ [EncryptionHelpers] Metadata extracted:", metadata);
      return metadata;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error extracting metadata:", error);
      return {
        algorithm: "unknown",
        isEncrypted: false,
        error: error.message,
      };
    }
  }

  // 🎭 SESSION MANAGEMENT

  createEncryptionSession(peerId, sessionKey, algorithm = "AES-GCM") {
    try {
      console.log(
        `🎭 [EncryptionHelpers] Creating encryption session for ${peerId}...`
      );

      const sessionId = `session_${peerId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const session = {
        sessionId,
        peerId,
        algorithm,
        sessionKey:
          sessionKey instanceof CryptoKey ? "CryptoKey" : typeof sessionKey,
        createdAt: new Date().toISOString(),
        messageCount: 0,
        lastUsed: new Date().toISOString(),
        isActive: true,
      };

      // Store in localStorage
      const existingSessions = this.getActiveSessions();
      existingSessions[sessionId] = session;
      localStorage.setItem("e2ee_sessions", JSON.stringify(existingSessions));

      console.log(`✅ [EncryptionHelpers] Session created: ${sessionId}`);
      return session;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error creating session:", error);
      throw error;
    }
  }

  closeEncryptionSession(sessionId) {
    try {
      console.log(`🎭 [EncryptionHelpers] Closing session: ${sessionId}`);

      const sessions = this.getActiveSessions();
      if (sessions[sessionId]) {
        sessions[sessionId].isActive = false;
        sessions[sessionId].closedAt = new Date().toISOString();
        localStorage.setItem("e2ee_sessions", JSON.stringify(sessions));

        console.log(`✅ [EncryptionHelpers] Session closed: ${sessionId}`);
        return true;
      }

      console.warn(`⚠️ [EncryptionHelpers] Session not found: ${sessionId}`);
      return false;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error closing session:", error);
      return false;
    }
  }

  getActiveSessions() {
    try {
      const stored = localStorage.getItem("e2ee_sessions");
      if (!stored) return {};

      const sessions = JSON.parse(stored);

      // Filter active sessions
      const activeSessions = {};
      for (const [sessionId, session] of Object.entries(sessions)) {
        if (session.isActive) {
          activeSessions[sessionId] = session;
        }
      }

      return activeSessions;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error getting sessions:", error);
      return {};
    }
  }

  updateSessionUsage(sessionId) {
    try {
      const sessions = this.getActiveSessions();
      if (sessions[sessionId]) {
        sessions[sessionId].lastUsed = new Date().toISOString();
        sessions[sessionId].messageCount =
          (sessions[sessionId].messageCount || 0) + 1;
        localStorage.setItem("e2ee_sessions", JSON.stringify(sessions));
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error updating session:", error);
      return false;
    }
  }

  cleanupOldSessions(maxAgeHours = 24) {
    try {
      console.log(
        `🧹 [EncryptionHelpers] Cleaning up old sessions (>${maxAgeHours}h)...`
      );

      const sessions = JSON.parse(
        localStorage.getItem("e2ee_sessions") || "{}"
      );
      const now = new Date();
      let cleanedCount = 0;

      for (const [sessionId, session] of Object.entries(sessions)) {
        const lastUsed = new Date(session.lastUsed);
        const hoursSinceLastUse = (now - lastUsed) / (1000 * 60 * 60);

        if (hoursSinceLastUse > maxAgeHours) {
          delete sessions[sessionId];
          cleanedCount++;
        }
      }

      localStorage.setItem("e2ee_sessions", JSON.stringify(sessions));
      console.log(
        `✅ [EncryptionHelpers] Cleaned up ${cleanedCount} old sessions`
      );
      return cleanedCount;
    } catch (error) {
      console.error(
        "❌ [EncryptionHelpers] Error cleaning up sessions:",
        error
      );
      return 0;
    }
  }

  // ⚡ PERFORMANCE OPTIMIZATION

  cacheEncryptionResult(cacheKey, result, ttl = 5 * 60 * 1000) {
    try {
      console.log(
        `⚡ [EncryptionHelpers] Caching encryption result: ${cacheKey}`
      );

      const cacheData = {
        result,
        timestamp: Date.now(),
        ttl,
      };

      const existingCache = JSON.parse(
        localStorage.getItem("e2ee_encryption_cache") || "{}"
      );
      existingCache[cacheKey] = cacheData;

      // Clean old cache entries
      const now = Date.now();
      const cleanedCache = {};
      for (const [key, data] of Object.entries(existingCache)) {
        if (now - data.timestamp < data.ttl) {
          cleanedCache[key] = data;
        }
      }

      localStorage.setItem(
        "e2ee_encryption_cache",
        JSON.stringify(cleanedCache)
      );

      console.log(`✅ [EncryptionHelpers] Result cached: ${cacheKey}`);
      return true;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error caching result:", error);
      return false;
    }
  }

  getCachedKey(cacheKey) {
    try {
      console.log(`⚡ [EncryptionHelpers] Getting cached key: ${cacheKey}`);

      const cache = JSON.parse(
        localStorage.getItem("e2ee_encryption_cache") || "{}"
      );
      const cached = cache[cacheKey];

      if (!cached) {
        console.log(`⚠️ [EncryptionHelpers] Cache miss: ${cacheKey}`);
        return null;
      }

      const now = Date.now();
      if (now - cached.timestamp > cached.ttl) {
        console.log(`⚠️ [EncryptionHelpers] Cache expired: ${cacheKey}`);
        delete cache[cacheKey];
        localStorage.setItem("e2ee_encryption_cache", JSON.stringify(cache));
        return null;
      }

      console.log(`✅ [EncryptionHelpers] Cache hit: ${cacheKey}`);
      return cached.result;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error getting cached key:", error);
      return null;
    }
  }

  clearEncryptionCache() {
    try {
      console.log("🧹 [EncryptionHelpers] Clearing encryption cache...");
      localStorage.removeItem("e2ee_encryption_cache");
      console.log("✅ [EncryptionHelpers] Encryption cache cleared");
      return true;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error clearing cache:", error);
      return false;
    }
  }

  getCacheStats() {
    try {
      const cache = JSON.parse(
        localStorage.getItem("e2ee_encryption_cache") || "{}"
      );
      const now = Date.now();

      let validCount = 0;
      let expiredCount = 0;
      let totalSize = 0;

      for (const [key, data] of Object.entries(cache)) {
        totalSize += JSON.stringify(data).length;

        if (now - data.timestamp < data.ttl) {
          validCount++;
        } else {
          expiredCount++;
        }
      }

      return {
        totalEntries: Object.keys(cache).length,
        validEntries: validCount,
        expiredEntries: expiredCount,
        estimatedSizeKB: (totalSize / 1024).toFixed(2),
      };
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error getting cache stats:", error);
      return {
        totalEntries: 0,
        validEntries: 0,
        expiredEntries: 0,
        estimatedSizeKB: "0.00",
      };
    }
  }

  // 🚨 ERROR HANDLING

  handleEncryptionError(error, context = {}) {
    try {
      console.error(`🚨 [EncryptionHelpers] Handling encryption error:`, {
        error: error.message,
        stack: error.stack,
        context,
      });

      const errorInfo = {
        timestamp: new Date().toISOString(),
        errorType: error.name,
        errorMessage: error.message,
        context,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      // Log to localStorage for debugging
      const errorLog = JSON.parse(
        localStorage.getItem("e2ee_error_log") || "[]"
      );
      errorLog.unshift(errorInfo);

      // Keep only last 100 errors
      if (errorLog.length > 100) {
        errorLog.length = 100;
      }

      localStorage.setItem("e2ee_error_log", JSON.stringify(errorLog));

      // Categorize error
      const category = this.categorizeEncryptionError(error);

      console.log(`📋 [EncryptionHelpers] Error categorized as: ${category}`);
      return category;
    } catch (logError) {
      console.error("❌ [EncryptionHelpers] Error logging failed:", logError);
      return "unknown";
    }
  }

  categorizeEncryptionError(error) {
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
    } else if (
      message.includes("network") ||
      message.includes("socket") ||
      message.includes("connection")
    ) {
      return "network_error";
    } else if (
      message.includes("storage") ||
      message.includes("localstorage") ||
      message.includes("quota")
    ) {
      return "storage_error";
    } else if (
      message.includes("type") ||
      message.includes("format") ||
      message.includes("json")
    ) {
      return "data_format_error";
    } else if (message.includes("timeout") || message.includes("expired")) {
      return "timeout_error";
    } else if (
      message.includes("permission") ||
      message.includes("security") ||
      message.includes("origin")
    ) {
      return "security_error";
    } else {
      return "unknown_error";
    }
  }

  getEncryptionErrorReason(category) {
    const reasons = {
      key_error: "Encryption key issue. Try regenerating your keys.",
      authentication_error: "Authentication failed. Check your password.",
      algorithm_error: "Unsupported encryption algorithm.",
      network_error: "Network connection issue. Check your internet.",
      storage_error: "Storage limit reached. Clear some data.",
      data_format_error: "Invalid data format. Try again.",
      timeout_error: "Operation timed out. Please retry.",
      security_error: "Security restriction. Check browser permissions.",
      unknown_error: "Unknown error occurred. Please try again.",
    };

    return reasons[category] || reasons.unknown_error;
  }

  suggestEncryptionFix(category) {
    const suggestions = {
      key_error: [
        "Regenerate your encryption keys in Settings",
        "Clear browser cache and reload",
        "Make sure you have the correct key for this chat",
      ],
      authentication_error: [
        "Re-enter your encryption password",
        "Reset your encryption keys if password is lost",
        "Check if Caps Lock is on",
      ],
      algorithm_error: [
        "Update your browser to the latest version",
        "Try using a different browser",
        "Contact support for compatibility issues",
      ],
      network_error: [
        "Check your internet connection",
        "Try switching between WiFi and mobile data",
        "Restart your router",
      ],
      storage_error: [
        "Clear browser storage for this site",
        "Delete old encrypted messages",
        "Use incognito mode temporarily",
      ],
      data_format_error: [
        "Refresh the page and try again",
        "Clear browser cache",
        "Send a shorter message",
      ],
      timeout_error: [
        "Wait a moment and try again",
        "Check your device performance",
        "Close other tabs/applications",
      ],
      security_error: [
        "Check browser security settings",
        "Enable cookies and local storage",
        "Try in a regular browser window (not incognito)",
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
    try {
      const errorLog = JSON.parse(
        localStorage.getItem("e2ee_error_log") || "[]"
      );
      return errorLog.slice(0, limit);
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error getting error log:", error);
      return [];
    }
  }

  clearErrorLog() {
    try {
      localStorage.removeItem("e2ee_error_log");
      console.log("✅ [EncryptionHelpers] Error log cleared");
      return true;
    } catch (error) {
      console.error("❌ [EncryptionHelpers] Error clearing error log:", error);
      return false;
    }
  }

  // 🛠️ UTILITY FUNCTIONS

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateMessageStructure(message) {
    try {
      const requiredFields = ["content", "timestamp"];
      const missingFields = requiredFields.filter((field) => !message[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
      }

      // Validate timestamp
      const timestamp = new Date(message.timestamp);
      if (isNaN(timestamp.getTime())) {
        throw new Error("Invalid timestamp");
      }

      // Validate content (basic checks)
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
      console.error("❌ [EncryptionHelpers] Message validation failed:", error);
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
          ? encryptionData.keyId.substring(0, 8) + "..."
          : "unknown",
        iv: encryptionData.iv
          ? encryptionData.iv.substring(0, 8) + "..."
          : "none",
        timestamp: encryptionData.timestamp || new Date().toISOString(),
        size: encryptionData.ciphertext
          ? typeof encryptionData.ciphertext === "string"
            ? encryptionData.ciphertext.length
            : encryptionData.ciphertext.byteLength
          : 0,
      };
    } catch (error) {
      console.error(
        "❌ [EncryptionHelpers] Error formatting encryption info:",
        error
      );
      return {
        algorithm: "unknown",
        keyId: "error",
        iv: "error",
        timestamp: new Date().toISOString(),
        size: 0,
      };
    }
  }
}

// Singleton instance
const encryptionHelpers = new EncryptionHelpers();
export default encryptionHelpers;
