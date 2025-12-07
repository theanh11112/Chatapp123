import { useCallback, useState, useMemo, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import {
  updateDecryptedMessage,
  updateEncryptionStatus,
} from "../redux/slices/conversation";
import { useKeycloak } from "@react-keycloak/web";

export const useE2EEDecryption = (e2eeService, chat_type) => {
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();
  const [autoDecryptInProgress, setAutoDecryptInProgress] = useState(false);
  const [e2eeMethods, setE2eeMethods] = useState({});
  const [e2eeReady, setE2eeReady] = useState(false);

  // 🛠️ FIX 1: Sử dụng ref để lưu trạng thái
  const isMountedRef = useRef(true);
  const lastCheckedRef = useRef(0);
  const serviceRef = useRef(e2eeService);

  const currentUserId = keycloak?.subject;

  // 🛠️ FIX 2: Cleanup khi unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 🛠️ FIX 3: Update serviceRef khi service thay đổi
  useEffect(() => {
    serviceRef.current = e2eeService;
  }, [e2eeService]);

  // Helper: Chuẩn hóa keyId
  const normalizeKeyId = useCallback((keyId) => {
    if (!keyId) {
      console.warn("⚠️ [normalizeKeyId] Empty keyId");
      return null;
    }

    // Nếu keyId là fingerprint 8 ký tự hex
    if (
      typeof keyId === "string" &&
      keyId.length === 8 &&
      /^[0-9A-F]+$/i.test(keyId)
    ) {
      const normalized = keyId.toUpperCase();
      return normalized;
    }

    // Nếu keyId là UUID
    if (
      typeof keyId === "string" &&
      keyId.length === 36 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        keyId
      )
    ) {
      return keyId.toLowerCase();
    }

    return keyId;
  }, []);

  // Tìm peerId từ fingerprint HOẶC keyId
  const findPeerIdByFingerprintOrKeyId = useCallback((identifier) => {
    if (!identifier) {
      console.warn("⚠️ [findPeerId] Empty identifier");
      return null;
    }

    try {
      // Strategy 1: Kiểm tra trong localStorage peer_keys
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys");
      if (!peerKeysStr) {
        return null;
      }

      const peerKeysData = JSON.parse(peerKeysStr);

      // Strategy 1A: Tìm trong array format
      if (Array.isArray(peerKeysData)) {
        for (const item of peerKeysData) {
          if (!item) continue;

          // Check by fingerprint
          if (
            item.fingerprint &&
            item.fingerprint.toUpperCase() === identifier.toUpperCase()
          ) {
            return item.peerId;
          }

          // Check by peerId
          if (
            item.peerId &&
            (item.peerId === identifier ||
              item.peerId.toLowerCase() === identifier.toLowerCase())
          ) {
            return item.peerId;
          }

          // Check by keyId
          if (
            item.keyId &&
            item.keyId.toUpperCase() === identifier.toUpperCase()
          ) {
            return item.peerId;
          }
        }
      }

      // Strategy 1B: Tìm trong object format
      if (typeof peerKeysData === "object" && peerKeysData !== null) {
        for (const [peerId, keyData] of Object.entries(peerKeysData)) {
          if (!keyData) continue;

          // Check by fingerprint
          if (
            keyData.fingerprint &&
            keyData.fingerprint.toUpperCase() === identifier.toUpperCase()
          ) {
            return peerId;
          }

          // Check by keyId
          if (
            keyData.keyId &&
            keyData.keyId.toUpperCase() === identifier.toUpperCase()
          ) {
            return peerId;
          }

          // Check by peerId
          if (
            peerId === identifier ||
            peerId.toLowerCase() === identifier.toLowerCase()
          ) {
            return peerId;
          }
        }
      }

      // Strategy 2: Kiểm tra trong shared_secrets
      const sharedSecretsStr = localStorage.getItem("e2ee_shared_secrets");
      if (sharedSecretsStr) {
        const sharedSecrets = JSON.parse(sharedSecretsStr);

        for (const [keyId, secret] of Object.entries(sharedSecrets)) {
          if (!secret) continue;

          if (
            keyId === identifier ||
            keyId.toLowerCase() === identifier.toLowerCase()
          ) {
            return keyId;
          }
        }
      }

      return null;
    } catch (error) {
      console.error("🔥 [findPeerId] Error:", error);
      return null;
    }
  }, []);

  // Tìm shared secret từ nhiều nguồn
  const findSharedSecret = useCallback((identifier) => {
    if (!identifier) {
      return null;
    }

    try {
      // Source 1: localStorage shared_secrets
      const sharedSecretsStr = localStorage.getItem("e2ee_shared_secrets");
      if (sharedSecretsStr) {
        const sharedSecrets = JSON.parse(sharedSecretsStr);

        // Thử identifier trực tiếp
        if (sharedSecrets[identifier]) {
          return {
            keyId: identifier,
            secret: sharedSecrets[identifier],
            source: "direct",
          };
        }

        // Thử tìm bằng normalized identifier
        const normalizedId = identifier.toUpperCase();
        for (const [keyId, secret] of Object.entries(sharedSecrets)) {
          if (keyId.toUpperCase() === normalizedId) {
            return {
              keyId: keyId,
              secret: secret,
              source: "normalized",
            };
          }
        }

        // Thử tìm bằng peer fingerprint
        for (const [keyId, secretData] of Object.entries(sharedSecrets)) {
          if (typeof secretData === "object" && secretData.secret) {
            if (
              secretData.derivedFrom?.peerFingerprint?.toUpperCase() ===
              normalizedId
            ) {
              return {
                keyId: keyId,
                secret: secretData.secret,
                source: "fingerprint",
                fingerprint: secretData.derivedFrom.peerFingerprint,
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error("🔥 [findSharedSecret] Error:", error);
      return null;
    }
  }, []);

  // Kiểm tra message hợp lệ
  const isValidEncryptedMessage = useCallback((message) => {
    if (!message) return false;

    if (message.isEncrypted !== true) {
      return false;
    }

    const hasCiphertext =
      !!message.ciphertext || !!message.encryptionData?.ciphertext;

    const hasIv = !!message.iv || !!message.encryptionData?.iv;

    if (!hasCiphertext || !hasIv) {
      return false;
    }

    return true;
  }, []);

  // Trích xuất dữ liệu mã hóa
  const extractEncryptionData = useCallback((message) => {
    // ƯU TIÊN: direct fields
    if (message.ciphertext && message.iv) {
      return {
        ciphertext: message.ciphertext,
        iv: message.iv,
        keyId: message.keyId,
        algorithm: message.algorithm || "AES-GCM-256",
        source: "direct",
      };
    }

    // Fallback: encryptionData
    if (message.encryptionData?.ciphertext && message.encryptionData?.iv) {
      return {
        ciphertext: message.encryptionData.ciphertext,
        iv: message.encryptionData.iv,
        keyId: message.encryptionData.keyId,
        algorithm: message.encryptionData.algorithm || "AES-GCM-256",
        source: "encryptionData",
      };
    }

    return null;
  }, []);

  // Manual decryption với base64 handling
  const manualDecrypt = async (ciphertext, iv, secretBase64) => {
    try {
      // Convert base64 to ArrayBuffer
      const base64ToArrayBuffer = (base64) => {
        try {
          const binaryString = window.atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        } catch (error) {
          throw new Error(`Base64 conversion failed: ${error.message}`);
        }
      };

      const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
      const ivBuffer = base64ToArrayBuffer(iv);
      const secretBuffer = base64ToArrayBuffer(secretBase64);

      // Import key
      const secretKey = await window.crypto.subtle.importKey(
        "raw",
        secretBuffer,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );

      // Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivBuffer,
        },
        secretKey,
        ciphertextBuffer
      );

      // Decode to string
      const decoder = new TextDecoder();
      const content = decoder.decode(decryptedBuffer);

      return {
        success: true,
        content,
      };
    } catch (error) {
      console.error("❌ [MANUAL DECRYPT] Error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Thử tất cả shared secrets
  const tryAllSharedSecrets = async (ciphertext, iv) => {
    try {
      const sharedSecretsStr = localStorage.getItem("e2ee_shared_secrets");
      if (!sharedSecretsStr) {
        return { success: false, error: "No shared secrets" };
      }

      const sharedSecrets = JSON.parse(sharedSecretsStr);
      const secretEntries = Object.entries(sharedSecrets);

      for (const [keyId, secretData] of secretEntries) {
        if (!secretData) continue;

        let secret;
        if (typeof secretData === "object" && secretData.secret) {
          secret = secretData.secret;
        } else {
          secret = secretData;
        }

        try {
          const result = await manualDecrypt(ciphertext, iv, secret);
          if (result.success) {
            return {
              success: true,
              content: result.content,
              keyId: keyId,
            };
          }
        } catch (error) {
          // Continue to next secret
        }
      }

      return { success: false, error: "No matching secret found" };
    } catch (error) {
      console.error("🔥 [TRY ALL SECRETS] Error:", error);
      return { success: false, error: error.message };
    }
  };

  // Hàm giải mã sử dụng Service có sẵn
  const decryptWithService = useCallback(
    async (message, serviceMethod = "auto") => {
      const messageId = message.id || message._id;

      try {
        if (!isValidEncryptedMessage(message)) {
          return {
            success: false,
            error: "Not a valid encrypted message",
            step: "validation",
          };
        }

        const encryptionData = extractEncryptionData(message);
        if (!encryptionData) {
          return {
            success: false,
            error: "No encryption data",
            step: "extraction",
          };
        }

        const senderId = message.sender?.keycloakId || message.from;
        if (!senderId) {
          return {
            success: false,
            error: "No sender ID",
            step: "sender_identification",
          };
        }

        const encryptedData = {
          ciphertext: encryptionData.ciphertext,
          iv: encryptionData.iv,
          keyId: encryptionData.keyId || senderId,
          algorithm: encryptionData.algorithm || "AES-GCM-256",
        };

        // Method 1: AutoEncryptionService (priority)
        if (serviceMethod === "auto" || serviceMethod === "autoService") {
          if (
            serviceRef.current &&
            typeof serviceRef.current.decryptMessage === "function"
          ) {
            try {
              const result = await serviceRef.current.decryptMessage(
                encryptedData,
                senderId
              );

              if (result?.success && result.content) {
                return {
                  success: true,
                  content: result.content,
                  method: "autoEncryptionService",
                  senderId,
                  keyId: encryptedData.keyId,
                };
              }
            } catch (error) {
              console.log("AutoEncryptionService failed:", error.message);
            }
          }
        }

        // Method 2: Direct E2EEService
        if (serviceMethod === "auto" || serviceMethod === "directService") {
          if (
            window.e2eeService &&
            typeof window.e2eeService.decryptMessage === "function"
          ) {
            try {
              const result = await window.e2eeService.decryptMessage(
                encryptedData,
                senderId
              );

              if (result?.success && result.content) {
                return {
                  success: true,
                  content: result.content,
                  method: "directE2EEService",
                  senderId,
                  keyId: encryptedData.keyId,
                };
              }
            } catch (error) {
              console.log("Direct E2EEService failed:", error.message);
            }
          }
        }

        // Method 3: Manual fallback
        if (serviceMethod === "auto" || serviceMethod === "manual") {
          const originalKeyId = encryptionData.keyId;
          const normalizedKeyId = normalizeKeyId(originalKeyId);

          const keyIdsToTry = new Set();
          if (normalizedKeyId) keyIdsToTry.add(normalizedKeyId);
          if (originalKeyId && originalKeyId !== normalizedKeyId)
            keyIdsToTry.add(originalKeyId);
          if (senderId && senderId !== currentUserId) keyIdsToTry.add(senderId);
          if (currentUserId) keyIdsToTry.add(currentUserId);

          const peerIdFromSender = findPeerIdByFingerprintOrKeyId(senderId);
          if (peerIdFromSender) keyIdsToTry.add(peerIdFromSender);

          const uniqueKeyIds = Array.from(keyIdsToTry).filter(Boolean);

          for (const tryKeyId of uniqueKeyIds) {
            const secretInfo = findSharedSecret(tryKeyId);
            if (secretInfo?.secret) {
              try {
                const manualResult = await manualDecrypt(
                  encryptionData.ciphertext,
                  encryptionData.iv,
                  secretInfo.secret
                );

                if (manualResult.success) {
                  return {
                    success: true,
                    content: manualResult.content,
                    method: "manual",
                    keyId: tryKeyId,
                    originalKeyId,
                  };
                }
              } catch (error) {
                // Continue to next key
              }
            }
          }

          // Try all secrets as last resort
          const allSecretsResult = await tryAllSharedSecrets(
            encryptionData.ciphertext,
            encryptionData.iv
          );

          if (allSecretsResult.success) {
            return {
              success: true,
              content: allSecretsResult.content,
              method: "brute_force",
              keyId: allSecretsResult.keyId,
              originalKeyId,
            };
          }
        }

        return {
          success: false,
          error: "All decryption methods failed",
          keyId: encryptionData.keyId,
          senderId,
        };
      } catch (error) {
        console.error("🔥 [DECRYPT WITH SERVICE] Error:", error);
        return {
          success: false,
          error: error.message,
          step: "unexpected_error",
        };
      }
    },
    [
      isValidEncryptedMessage,
      extractEncryptionData,
      normalizeKeyId,
      currentUserId,
      findPeerIdByFingerprintOrKeyId,
      findSharedSecret,
    ]
  );

  // Hàm giải mã chính (compatible với interface cũ)
  const decryptMessageDirectly = useCallback(
    async (message) => {
      return await decryptWithService(message, "auto");
    },
    [decryptWithService]
  );

  // Handle retry decrypt
  const handleRetryDecrypt = useCallback(
    async (message) => {
      console.log("🔄 [RETRY DECRYPT] Retrying decryption for:", message.id);

      // Update status to decrypting
      dispatch(
        updateEncryptionStatus({
          messageId: message.id,
          status: "decrypting",
          chatType: chat_type,
        })
      );

      try {
        const result = await decryptWithService(message, "auto");

        if (result.success) {
          // Update decrypted content
          dispatch(
            updateDecryptedMessage({
              messageId: message.id,
              decryptedContent: result.content,
              keyId: result.keyId,
              chatType: chat_type,
            })
          );

          return {
            success: true,
            content: result.content,
          };
        } else {
          // Update status to failed
          dispatch(
            updateEncryptionStatus({
              messageId: message.id,
              status: "decryption_failed",
              chatType: chat_type,
            })
          );

          return {
            success: false,
            error: result.error,
          };
        }
      } catch (error) {
        console.error("🔥 [RETRY DECRYPT] Error:", error);
        dispatch(
          updateEncryptionStatus({
            messageId: message.id,
            status: "decryption_failed",
            chatType: chat_type,
          })
        );

        return {
          success: false,
          error: error.message,
        };
      }
    },
    [decryptWithService, dispatch, chat_type]
  );

  // Auto decrypt all messages
  const autoDecryptAllMessages = useCallback(
    async (messages, peerId = null) => {
      console.log("🔐 [AUTO DECRYPT ALL] Starting...", {
        totalMessages: messages?.length,
        peerId,
      });

      setAutoDecryptInProgress(true);

      try {
        const encryptedMessages = messages.filter(
          (msg) => isValidEncryptedMessage(msg) && !msg.isDecrypted
        );

        console.log(`🔐 Found ${encryptedMessages.length} encrypted messages`);

        let decryptedCount = 0;
        let failedCount = 0;
        const results = [];

        // Process in batches to avoid UI freeze
        const batchSize = 5;
        for (let i = 0; i < encryptedMessages.length; i += batchSize) {
          const batch = encryptedMessages.slice(i, i + batchSize);
          const batchPromises = batch.map(async (message) => {
            try {
              // Update status to decrypting
              dispatch(
                updateEncryptionStatus({
                  messageId: message.id,
                  status: "decrypting",
                  chatType: chat_type,
                })
              );

              const result = await decryptWithService(message, "auto");

              if (result.success) {
                dispatch(
                  updateDecryptedMessage({
                    messageId: message.id,
                    decryptedContent: result.content,
                    keyId: result.keyId,
                    chatType: chat_type,
                  })
                );
                decryptedCount++;
                return { id: message.id, success: true };
              } else {
                dispatch(
                  updateEncryptionStatus({
                    messageId: message.id,
                    status: "decryption_failed",
                    chatType: chat_type,
                  })
                );
                failedCount++;
                return { id: message.id, success: false, error: result.error };
              }
            } catch (error) {
              console.error(`🔥 Error decrypting ${message.id}:`, error);
              failedCount++;
              return { id: message.id, success: false, error: error.message };
            }
          });

          await Promise.allSettled(batchPromises);

          // Small delay between batches
          if (i + batchSize < encryptedMessages.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }

        console.log(
          `🎉 Auto-decrypt complete: ${decryptedCount} successful, ${failedCount} failed`
        );
        return {
          decryptedCount,
          failedCount,
          total: encryptedMessages.length,
        };
      } catch (error) {
        console.error("🔥 [AUTO DECRYPT ALL] Error:", error);
        return {
          decryptedCount: 0,
          failedCount: 0,
          total: 0,
          error: error.message,
        };
      } finally {
        setAutoDecryptInProgress(false);
      }
    },
    [isValidEncryptedMessage, decryptWithService, dispatch, chat_type]
  );

  // Check E2EE service
  const checkE2EEService = useCallback(() => {
    const now = Date.now();
    if (now - lastCheckedRef.current < 5000) {
      return { isReady: e2eeReady, methods: e2eeMethods };
    }

    lastCheckedRef.current = now;

    if (serviceRef.current) {
      const methods = {
        hasDecrypt: typeof serviceRef.current.decrypt === "function",
        hasDecryptMessage:
          typeof serviceRef.current.decryptMessage === "function",
        hasDecryptWithKey:
          typeof serviceRef.current.decryptWithKey === "function",
        hasKeyPair: typeof serviceRef.current.hasKeyPair === "function",
        hasGetMyFingerprint:
          typeof serviceRef.current.getMyFingerprint === "function",
      };

      const isReady =
        typeof serviceRef.current.isReady === "function"
          ? serviceRef.current.isReady()
          : methods.hasDecryptMessage;

      if (isMountedRef.current) {
        setE2eeMethods(methods);
        setE2eeReady(isReady);
      }

      return { isReady, methods };
    }

    // Also check for direct E2EE service
    if (window.e2eeService) {
      const methods = {
        hasDecryptMessage:
          typeof window.e2eeService.decryptMessage === "function",
        hasKeyPair: typeof window.e2eeService.loadKeyPair === "function",
      };

      const isReady =
        typeof window.e2eeService.isReady === "function"
          ? window.e2eeService.isReady()
          : methods.hasDecryptMessage;

      if (isMountedRef.current) {
        setE2eeMethods(methods);
        setE2eeReady(isReady);
      }

      return { isReady, methods };
    }

    if (isMountedRef.current) {
      setE2eeMethods({});
      setE2eeReady(false);
    }

    return { isReady: false, methods: {} };
  }, [e2eeReady, e2eeMethods]);

  // Effect với cleanup
  useEffect(() => {
    if (!isMountedRef.current) return;

    const timeoutId = setTimeout(() => {
      checkE2EEService();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [checkE2EEService]);

  // Return MEMOIZED
  return useMemo(
    () => ({
      // State
      autoDecryptInProgress,
      e2eeMethods,
      e2eeReady,

      // Validation & Extraction
      isValidEncryptedMessage,
      extractEncryptionData,

      // Core Decryption Functions
      decryptMessageDirectly,
      decryptWithService, // New: Direct service decryption

      // UI Handlers
      handleRetryDecrypt,
      autoDecryptAllMessages,

      // Service Management
      checkE2EEService,

      // Utility Functions
      normalizeKeyId,
      findPeerIdByFingerprintOrKeyId,
      findSharedSecret,

      // Additional utilities
      getServiceStatus: () => ({
        autoService: !!serviceRef.current,
        directService: !!window.e2eeService,
        methods: e2eeMethods,
        isReady: e2eeReady,
      }),

      // Debug function
      debugDecryption: async (message) => {
        console.group("🔍 [DEBUG DECRYPTION]");
        console.log("Message:", message);
        console.log("Is valid:", isValidEncryptedMessage(message));
        console.log("Extracted data:", extractEncryptionData(message));
        console.log("Service ref:", serviceRef.current);
        console.log("Direct service:", window.e2eeService);

        const result = await decryptWithService(message, "auto");
        console.log("Decryption result:", result);
        console.groupEnd();
        return result;
      },
    }),
    [
      autoDecryptInProgress,
      e2eeMethods,
      e2eeReady,
      isValidEncryptedMessage,
      extractEncryptionData,
      decryptMessageDirectly,
      decryptWithService,
      handleRetryDecrypt,
      autoDecryptAllMessages,
      checkE2EEService,
      normalizeKeyId,
      findPeerIdByFingerprintOrKeyId,
      findSharedSecret,
    ]
  );
};
