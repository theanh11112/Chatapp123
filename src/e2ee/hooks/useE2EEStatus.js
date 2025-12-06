// e2ee/hooks/useE2EEStatus.js
import { useState, useEffect, useCallback } from "react";
import { useE2EE } from "../../contexts/E2EEContext";

export const useE2EEStatus = (peerId = null, roomId = null) => {
  const {
    e2eeEnabled,
    getFriendKey,
    initiateKeyExchange: contextInitiateKeyExchange,
    friendsE2EEStatus = {},
    e2eeService,
    socketReady,
    autoEncryption,
  } = useE2EE();

  const [status, setStatus] = useState("checking");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [canEncrypt, setCanEncrypt] = useState(false);
  const [isEstablishing, setIsEstablishing] = useState(false);
  const [isKeyExchangeNeeded, setIsKeyExchangeNeeded] = useState(false);
  const [peerFingerprint, setPeerFingerprint] = useState(null);
  const [hasPeerKey, setHasPeerKey] = useState(false);

  // 🆕 QUAN TRỌNG: Kiểm tra xem bạn có E2EE enabled không từ server
  // 🆕 CẢI THIỆN: Kiểm tra friend E2EE status
  const checkFriendE2EEStatus = useCallback(async () => {
    if (!peerId || !autoEncryption) {
      console.log(
        `🔍 [checkFriendE2EEStatus] Missing peerId or autoEncryption`
      );
      return false;
    }

    try {
      console.log(`🔍 [checkFriendE2EEStatus] Checking for peer: ${peerId}`);

      // 1. Kiểm tra trong localStorage
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys") || "[]";
      const peerKeys = JSON.parse(peerKeysStr);
      const peerKey = peerKeys.find((k) => k.peerId === peerId);

      if (peerKey) {
        console.log(`✅ [checkFriendE2EEStatus] Found in localStorage:`, {
          fingerprint: peerKey.fingerprint,
          hasPublicKey: !!peerKey.publicKey,
        });
        return true;
      }

      // 2. Kiểm tra từ context
      if (friendsE2EEStatus[peerId] !== undefined) {
        console.log(
          `✅ [checkFriendE2EEStatus] From context:`,
          friendsE2EEStatus[peerId]
        );
        return friendsE2EEStatus[peerId];
      }

      // 3. Kiểm tra từ autoEncryption
      if (autoEncryption.hasPeerKey) {
        try {
          const hasKey = await autoEncryption.hasPeerKey(peerId);
          console.log(
            `✅ [checkFriendE2EEStatus] From autoEncryption: ${hasKey}`
          );
          return hasKey;
        } catch (error) {
          console.warn(
            `⚠️ [checkFriendE2EEStatus] autoEncryption.hasPeerKey error:`,
            error
          );
        }
      }

      // 4. Kiểm tra từ server qua socket
      if (autoEncryption.requestFriendKey) {
        try {
          console.log(`🔄 [checkFriendE2EEStatus] Requesting from server...`);
          const result = await autoEncryption.requestFriendKey(peerId);
          if (result.success && result.key) {
            console.log(`✅ [checkFriendE2EEStatus] Got key from server`);
            return true;
          }
        } catch (error) {
          console.warn(
            `⚠️ [checkFriendE2EEStatus] Server request error:`,
            error
          );
        }
      }

      console.log(`❌ [checkFriendE2EEStatus] No key found for peer ${peerId}`);
      return false;
    } catch (error) {
      console.error(`❌ [checkFriendE2EEStatus] Error:`, error);
      return false;
    }
  }, [peerId, autoEncryption, friendsE2EEStatus]);

  // 🆕 THÊM: Function để tự động derive shared secret
  // Sửa hàm deriveSharedSecretIfNeeded trong useE2EEStatus.js
  const deriveSharedSecretIfNeeded = useCallback(async () => {
    if (!peerId || !autoEncryption) {
      console.log(
        `❌ [deriveSharedSecretIfNeeded] Missing peerId or autoEncryption`
      );
      return false;
    }

    try {
      console.log(
        `🔐 [deriveSharedSecretIfNeeded] Checking for peer: ${peerId}`
      );

      // 1. Kiểm tra đã có shared secret chưa
      let hasSecret = false;
      if (autoEncryption.hasSharedSecret) {
        hasSecret = await autoEncryption.hasSharedSecret(peerId);
      } else {
        // Fallback: check localStorage
        const sessionKey = localStorage.getItem(`e2ee_session_${peerId}`);
        hasSecret = !!sessionKey;
      }

      if (hasSecret) {
        console.log(
          `✅ [deriveSharedSecretIfNeeded] Already has shared secret`
        );
        return true;
      }

      // 2. Kiểm tra có public key của peer không
      const hasPeerKey = await checkFriendE2EEStatus();
      if (!hasPeerKey) {
        console.log(`❌ [deriveSharedSecretIfNeeded] No peer key available`);
        return false;
      }

      // 3. Tự động derive shared secret - SỬA LẠI PHẦN NÀY
      console.log(`🔄 [deriveSharedSecretIfNeeded] Deriving shared secret...`);

      // Option A: Sử dụng autoEncryption.deriveSharedSecret nếu có
      if (autoEncryption.deriveSharedSecret) {
        const result = await autoEncryption.deriveSharedSecret(peerId);
        if (result.success) {
          console.log(
            `✅ [deriveSharedSecretIfNeeded] Shared secret derived via autoEncryption`
          );
          return true;
        }
      }

      // Option B: Sử dụng keyUtils trực tiếp
      try {
        const keyUtils = require("../utils/keyUtils").default;
        if (keyUtils && keyUtils.deriveSharedSecret) {
          // Lấy keys từ localStorage
          const ownPrivateKeyStr = localStorage.getItem("e2ee_private_key");
          if (!ownPrivateKeyStr || ownPrivateKeyStr === "{}") {
            throw new Error("No private key found");
          }

          const ownPrivateKeyJwk = JSON.parse(ownPrivateKeyStr);

          // Lấy peer public key từ localStorage
          const peerKeysStr = localStorage.getItem("e2ee_peer_keys") || "[]";
          const peerKeys = JSON.parse(peerKeysStr);
          const peerKeyInfo = peerKeys.find((k) => k.peerId === peerId);

          if (!peerKeyInfo?.publicKey) {
            throw new Error("No peer public key found");
          }

          const peerPublicKeyJwk = JSON.parse(peerKeyInfo.publicKey);

          // Derive shared secret
          const sharedSecret = await keyUtils.deriveSharedSecret(
            ownPrivateKeyJwk,
            peerPublicKeyJwk
          );

          // Lưu vào localStorage
          localStorage.setItem(
            `e2ee_session_${peerId}`,
            JSON.stringify({
              derivedAt: Date.now(),
              peerId: peerId,
              source: "keyUtils-direct",
            })
          );

          console.log(
            `✅ [deriveSharedSecretIfNeeded] Shared secret derived via keyUtils`
          );
          return true;
        }
      } catch (keyUtilsError) {
        console.warn(
          `⚠️ [deriveSharedSecretIfNeeded] keyUtils direct failed:`,
          keyUtilsError
        );
      }

      // Option C: Fallback - Chỉ cần có public key là đủ để mã hóa
      // AutoEncryptionService.encryptMessage sẽ tự động derive khi cần
      if (hasPeerKey) {
        console.log(
          `ℹ️ [deriveSharedSecretIfNeeded] Has peer key, encryption will derive on demand`
        );

        // Lưu vào localStorage để đánh dấu đã sẵn sàng
        localStorage.setItem(
          `e2ee_ready_${peerId}`,
          JSON.stringify({
            timestamp: Date.now(),
            hasKey: true,
          })
        );

        return true;
      }

      console.log(
        `❌ [deriveSharedSecretIfNeeded] No derivation method available`
      );
      return false;
    } catch (error) {
      console.error(`❌ [deriveSharedSecretIfNeeded] Error:`, error);
      return false;
    }
  }, [peerId, autoEncryption, checkFriendE2EEStatus]);

  // 🆕 QUAN TRỌNG: checkEncryptionStatus - FIXED
  // 🆕 CẬP NHẬT HOÀN CHỈNH: checkEncryptionStatus
  const checkEncryptionStatus = useCallback(async () => {
    try {
      console.log("🔐 [useE2EEStatus] checkEncryptionStatus called for:", {
        peerId,
        e2eeEnabled,
      });

      // 1. Kiểm tra điều kiện cơ bản
      if (!e2eeEnabled) {
        console.log("🔓 [checkEncryptionStatus] E2EE is disabled");
        setStatus("disabled");
        setIsEncrypted(false);
        setCanEncrypt(false);
        setIsKeyExchangeNeeded(false);
        return { canEncrypt: false, isEncrypted: false, status: "disabled" };
      }

      if (!peerId) {
        console.log("🔓 [checkEncryptionStatus] No peerId provided");
        setStatus("no_peer");
        setIsEncrypted(false);
        setCanEncrypt(false);
        setIsKeyExchangeNeeded(false);
        return { canEncrypt: false, isEncrypted: false, status: "no_peer" };
      }

      // 2. Kiểm tra autoEncryption service
      if (!autoEncryption) {
        console.log(
          "❌ [checkEncryptionStatus] Auto encryption service not available"
        );
        setStatus("error");
        setCanEncrypt(false);
        setIsEncrypted(false);
        return { canEncrypt: false, isEncrypted: false, status: "error" };
      }

      // 3. Đảm bảo autoEncryption đã sẵn sàng
      let isReady = false;
      try {
        isReady = await autoEncryption.isReady();
        console.log(
          `🔐 [checkEncryptionStatus] Auto encryption ready: ${isReady}`
        );
      } catch (error) {
        console.warn(`⚠️ [checkEncryptionStatus] isReady check failed:`, error);
      }

      if (!isReady) {
        console.log("⏳ [checkEncryptionStatus] Auto encryption not ready");
        setStatus("establishing");
        setIsEstablishing(true);
        setCanEncrypt(false);
        setIsEncrypted(false);

        // Thử lại sau 1 giây
        setTimeout(() => {
          checkEncryptionStatus();
        }, 1000);

        return {
          canEncrypt: false,
          isEncrypted: false,
          status: "establishing",
        };
      }

      setIsEstablishing(false);

      // 4. Kiểm tra có public key của peer không
      const friendHasE2EE = await checkFriendE2EEStatus();
      console.log(
        `🔑 [checkEncryptionStatus] Friend has E2EE/key: ${friendHasE2EE}`
      );
      setHasPeerKey(friendHasE2EE);

      if (!friendHasE2EE) {
        console.log(`🔑 [checkEncryptionStatus] No peer key, needs exchange`);
        setStatus("key_exchange_pending");
        setIsEncrypted(false);
        setCanEncrypt(false);
        setIsKeyExchangeNeeded(true);
        return {
          canEncrypt: false,
          isEncrypted: false,
          status: "key_exchange_pending",
          needsKeyExchange: true,
        };
      }

      // 5. 🆕 QUAN TRỌNG: Tự động derive shared secret nếu cần
      const hasDerivedSecret = await deriveSharedSecretIfNeeded();

      if (!hasDerivedSecret) {
        console.log(
          `⚠️ [checkEncryptionStatus] Could not derive shared secret`
        );
        setStatus("needs_derivation");
        setIsEncrypted(false);
        setCanEncrypt(true); // Có thể mã hóa sau khi derive
        setIsKeyExchangeNeeded(false);
        return {
          canEncrypt: true,
          isEncrypted: false,
          status: "needs_derivation",
          needsDerivation: true,
        };
      }

      // 6. Kiểm tra có thể mã hóa không
      let canEncryptForPeer = false;
      if (autoEncryption.canEncryptFor) {
        canEncryptForPeer = await autoEncryption.canEncryptFor(peerId);
      } else {
        // Fallback: nếu có shared secret thì có thể mã hóa
        const hasSecret = await deriveSharedSecretIfNeeded();
        canEncryptForPeer = hasSecret;
      }

      console.log(
        `🔐 [checkEncryptionStatus] Can encrypt for peer: ${canEncryptForPeer}`
      );
      setCanEncrypt(canEncryptForPeer);

      // 7. Lấy fingerprint
      let fingerprint = null;
      if (autoEncryption.getPeerFingerprint) {
        fingerprint = await autoEncryption.getPeerFingerprint(peerId);
      } else {
        // Lấy từ localStorage
        const peerKeysStr = localStorage.getItem("e2ee_peer_keys") || "[]";
        const peerKeys = JSON.parse(peerKeysStr);
        const peerKey = peerKeys.find((k) => k.peerId === peerId);
        fingerprint = peerKey?.fingerprint || null;
      }

      setPeerFingerprint(fingerprint);
      console.log(
        `🔐 [checkEncryptionStatus] Peer fingerprint: ${fingerprint}`
      );

      // 8. Xác định trạng thái cuối cùng
      if (canEncryptForPeer) {
        console.log(
          `✅ [checkEncryptionStatus] Encryption READY for ${peerId}`
        );
        setStatus("encrypted");
        setIsEncrypted(true);
        setIsKeyExchangeNeeded(false);
        return {
          canEncrypt: true,
          isEncrypted: true,
          status: "encrypted",
          fingerprint: fingerprint,
          ready: true,
        };
      } else {
        console.log(`⚠️ [checkEncryptionStatus] Encryption not ready`);
        setStatus("establishing");
        setIsEncrypted(false);
        return {
          canEncrypt: false,
          isEncrypted: false,
          status: "establishing",
        };
      }
    } catch (error) {
      console.error("❌ [checkEncryptionStatus] Error:", error);
      setStatus("error");
      setIsEncrypted(false);
      setCanEncrypt(false);
      setIsKeyExchangeNeeded(false);
      return {
        canEncrypt: false,
        isEncrypted: false,
        status: "error",
        error: error.message,
      };
    }
  }, [
    peerId,
    e2eeEnabled,
    autoEncryption,
    checkFriendE2EEStatus,
    deriveSharedSecretIfNeeded,
  ]);

  // 🆕 Hàm initiateKeyExchange - IMPROVED
  // 🆕 CẬP NHẬT: initiateKeyExchange với tự động derive
  const initiateKeyExchange = useCallback(async () => {
    if (!peerId || !contextInitiateKeyExchange) {
      console.error(
        "❌ [initiateKeyExchange] Missing peerId or context function"
      );
      return false;
    }

    try {
      setIsEstablishing(true);
      console.log("🔄 [initiateKeyExchange] Starting for peer:", peerId);

      // 1. Kiểm tra trạng thái hiện tại
      const currentStatus = await checkEncryptionStatus();
      console.log(`📊 [initiateKeyExchange] Current status:`, currentStatus);

      // 2. Nếu đã có key, chỉ cần derive shared secret
      if (currentStatus.hasPeerKey || currentStatus.canEncrypt) {
        console.log(`✅ [initiateKeyExchange] Already has peer key`);

        if (!currentStatus.isEncrypted) {
          console.log(`🔄 [initiateKeyExchange] Deriving shared secret...`);
          const derived = await deriveSharedSecretIfNeeded();

          if (derived) {
            console.log(`✅ [initiateKeyExchange] Shared secret derived`);
            await checkEncryptionStatus();
            setIsEstablishing(false);
            return true;
          }
        } else {
          console.log(`✅ [initiateKeyExchange] Already encrypted`);
          setIsEstablishing(false);
          return true;
        }
      }

      // 3. Thực hiện key exchange
      console.log(`🔄 [initiateKeyExchange] Initiating key exchange...`);
      const result = await contextInitiateKeyExchange(peerId);

      if (!result) {
        console.error(`❌ [initiateKeyExchange] Key exchange failed`);
        setIsEstablishing(false);
        return false;
      }

      console.log(`✅ [initiateKeyExchange] Key exchange initiated`);

      // 4. Đợi 2 giây rồi kiểm tra lại và derive shared secret
      setTimeout(async () => {
        try {
          console.log(
            `🔍 [initiateKeyExchange] Checking status after exchange...`
          );
          await checkEncryptionStatus();

          // Tự động derive shared secret nếu có key mới
          await deriveSharedSecretIfNeeded();

          // Kiểm tra lại lần nữa
          await checkEncryptionStatus();
        } catch (error) {
          console.error(
            `❌ [initiateKeyExchange] Post-exchange check error:`,
            error
          );
        }
      }, 2000);

      setIsEstablishing(false);
      return true;
    } catch (error) {
      console.error("❌ [initiateKeyExchange] Error:", error);
      setIsEstablishing(false);
      return false;
    }
  }, [
    peerId,
    contextInitiateKeyExchange,
    checkEncryptionStatus,
    deriveSharedSecretIfNeeded,
  ]);

  // Auto-check khi peerId thay đổi
  // Auto-check khi peerId thay đổi - CẬP NHẬT
  useEffect(() => {
    if (!peerId || !e2eeEnabled) return;

    console.log(`🔄 [useE2EEStatus] useEffect triggered for peer: ${peerId}`);

    let mounted = true;

    const checkWithRetry = async () => {
      if (!mounted) return;

      try {
        // Đợi 500ms cho các service khởi tạo
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!mounted) return;

        // Kiểm tra encryption status
        await checkEncryptionStatus();

        // Nếu không encrypted, thử derive shared secret sau 1 giây
        if (mounted && !isEncrypted && hasPeerKey) {
          setTimeout(async () => {
            if (mounted) {
              console.log(`🔄 [useE2EEStatus] Auto-deriving shared secret...`);
              await deriveSharedSecretIfNeeded();
              await checkEncryptionStatus();
            }
          }, 1000);
        }
      } catch (error) {
        console.error(`❌ [useE2EEStatus] Auto-check error:`, error);
      }
    };

    checkWithRetry();

    return () => {
      mounted = false;
    };
  }, [
    peerId,
    e2eeEnabled,
    checkEncryptionStatus,
    isEncrypted,
    hasPeerKey,
    deriveSharedSecretIfNeeded,
  ]);
  // Lắng nghe socket events
  useEffect(() => {
    if (!socketReady || !autoEncryption) return;

    const handleFriendKeyUpdated = (data) => {
      console.log(`🔄 Friend key updated event received:`, data);
      if (data.userId === peerId || data.friendId === peerId) {
        setTimeout(() => checkEncryptionStatus(), 300);
      }
    };

    const handleKeysSyncCompleted = () => {
      console.log(`🔄 Keys sync completed, re-checking...`);
      setTimeout(() => checkEncryptionStatus(), 500);
    };

    // Lắng nghe events
    if (autoEncryption.on) {
      autoEncryption.on("friendKeyUpdated", handleFriendKeyUpdated);
      autoEncryption.on("keysSyncCompleted", handleKeysSyncCompleted);
    }

    return () => {
      if (autoEncryption.off) {
        autoEncryption.off("friendKeyUpdated", handleFriendKeyUpdated);
        autoEncryption.off("keysSyncCompleted", handleKeysSyncCompleted);
      }
    };
  }, [socketReady, peerId, autoEncryption, checkEncryptionStatus]);

  return {
    // State
    status,
    isEncrypted,
    canEncrypt,
    isEstablishing,
    isKeyExchangeNeeded,
    peerFingerprint,
    hasPeerKey,

    // Methods
    initiateKeyExchange,
    checkEncryptionStatus,

    // 🆕 THÊM: Helper methods
    isReady: status === "encrypted" || status === "ready",
    needsKeyExchange: isKeyExchangeNeeded || status === "key_exchange_pending",
    needsDerivation: status === "needs_derivation",
    isError: status === "error",
    isDisabled: status === "disabled",

    // 🆕 THÊM: Derived secret helper
    deriveSharedSecret: deriveSharedSecretIfNeeded,
  };
};

export default useE2EEStatus;
