/**
 * Advanced key utilities - only key operations and format conversions
 * Uses Web Crypto API when available
 */

class KeyUtils {
  constructor() {
    console.log("🔑 [KeyUtils] Initialized");
  }

  // ======================= KEY GENERATION =======================

  async generateECDHKeyPair() {
    try {
      if (!window.crypto?.subtle) {
        throw new Error("Web Crypto API not supported");
      }

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey", "deriveBits"]
      );

      console.log("✅ [KeyUtils] ECDH key pair generated");
      return keyPair;
    } catch (error) {
      console.error("❌ [KeyUtils] Error generating ECDH key pair:", error);
      throw error;
    }
  }

  async generateRSAKeyPair() {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
      );

      console.log("✅ [KeyUtils] RSA key pair generated");
      return keyPair;
    } catch (error) {
      console.error("❌ [KeyUtils] Error generating RSA key pair:", error);
      throw error;
    }
  }

  generateSymmetricKey(length = 256) {
    try {
      if (window.crypto?.getRandomValues) {
        const keyBytes = length / 8;
        const key = new Uint8Array(keyBytes);
        window.crypto.getRandomValues(key);

        return Array.from(key)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      } else {
        throw new Error("Web Crypto API not available");
      }
    } catch (error) {
      console.error("❌ [KeyUtils] Error generating symmetric key:", error);
      throw error;
    }
  }

  // ======================= KEY FORMAT CONVERSION =======================

  async exportKeyToJWK(key) {
    try {
      const jwk = await window.crypto.subtle.exportKey("jwk", key);
      return jwk;
    } catch (error) {
      console.error("❌ [KeyUtils] Error exporting key to JWK:", error);
      throw error;
    }
  }

  async importKeyFromJWK(jwk, keyUsages) {
    try {
      const key = await window.crypto.subtle.importKey(
        "jwk",
        jwk,
        {
          name: jwk.kty === "EC" ? "ECDH" : "RSA-OAEP",
          namedCurve: jwk.crv || "P-256",
          hash: jwk.alg?.includes("SHA-256") ? "SHA-256" : undefined,
        },
        true,
        keyUsages
      );

      return key;
    } catch (error) {
      console.error("❌ [KeyUtils] Error importing key from JWK:", error);
      throw error;
    }
  }

  async exportKeyToPEM(key, isPrivate = false) {
    try {
      const format = isPrivate ? "pkcs8" : "spki";
      const exported = await window.crypto.subtle.exportKey(format, key);

      const exportedAsString = String.fromCharCode.apply(
        null,
        new Uint8Array(exported)
      );

      const exportedAsBase64 = window.btoa(exportedAsString);
      const type = isPrivate ? "PRIVATE" : "PUBLIC";

      const pem = [
        `-----BEGIN ${type} KEY-----`,
        ...exportedAsBase64.match(/.{1,64}/g),
        `-----END ${type} KEY-----`,
      ].join("\n");

      return pem;
    } catch (error) {
      console.error("❌ [KeyUtils] Error exporting key to PEM:", error);
      throw error;
    }
  }

  async importKeyFromPEM(pem, keyUsages, isPrivate = false) {
    try {
      // Extract base64 from PEM
      const base64 = pem
        .replace(/-----BEGIN (?:RSA )?(?:PUBLIC|PRIVATE) KEY-----/, "")
        .replace(/-----END (?:RSA )?(?:PUBLIC|PRIVATE) KEY-----/, "")
        .replace(/\s+/g, "");

      const binary = window.atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const format = isPrivate ? "pkcs8" : "spki";
      const algorithm = pem.includes("RSA")
        ? {
            name: "RSA-OAEP",
            hash: "SHA-256",
          }
        : {
            name: "ECDH",
            namedCurve: "P-256",
          };

      const key = await window.crypto.subtle.importKey(
        format,
        bytes,
        algorithm,
        true,
        keyUsages
      );

      return key;
    } catch (error) {
      console.error("❌ [KeyUtils] Error importing key from PEM:", error);
      throw error;
    }
  }

  // ======================= KEY DERIVATION =======================

  async deriveSharedSecret(ownPrivateKeyJwk, peerPublicKeyJwk) {
    try {
      console.group("🔗 [KeyUtils] Deriving shared secret - FIXED VERSION");

      // Parse JWKs
      const ownPrivateKey =
        typeof ownPrivateKeyJwk === "string"
          ? JSON.parse(ownPrivateKeyJwk)
          : ownPrivateKeyJwk;

      const peerPublicKey =
        typeof peerPublicKeyJwk === "string"
          ? JSON.parse(peerPublicKeyJwk)
          : peerPublicKeyJwk;

      console.log("JWKs:", {
        ownKeyType: ownPrivateKey.kty,
        ownHasPrivateKey: !!ownPrivateKey.d,
        peerKeyType: peerPublicKey.kty,
        peerHasPublicKey: !!peerPublicKey.x,
      });

      // Import keys
      const ownPrivateCryptoKey = await window.crypto.subtle.importKey(
        "jwk",
        ownPrivateKey,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        false, // Không extractable cho private key
        ["deriveKey", "deriveBits"]
      );

      const peerPublicCryptoKey = await window.crypto.subtle.importKey(
        "jwk",
        peerPublicKey,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true, // Extractable cho public key
        []
      );

      // Derive raw shared secret
      const rawSharedSecret = await window.crypto.subtle.deriveBits(
        {
          name: "ECDH",
          public: peerPublicCryptoKey,
        },
        ownPrivateCryptoKey,
        256
      );

      console.log("Raw shared secret derived:", {
        byteLength: rawSharedSecret.byteLength,
        hexPreview: Array.from(new Uint8Array(rawSharedSecret.slice(0, 8)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" "),
      });

      // ⭐⭐ QUAN TRỌNG: Tạo CryptoKey với extractable = true
      const derivedKey = await window.crypto.subtle.importKey(
        "raw",
        rawSharedSecret,
        {
          name: "AES-GCM",
          length: 256,
        },
        true, // ⭐⭐ EXTRACTABLE = TRUE
        ["encrypt", "decrypt"]
      );

      console.log("✅ Shared secret derived successfully!");
      console.log("Key properties:", {
        extractable: derivedKey.extractable, // Phải là TRUE
        algorithm: derivedKey.algorithm.name,
        type: derivedKey.type,
        usages: derivedKey.usages,
      });

      console.groupEnd();
      return derivedKey;
    } catch (error) {
      console.error("❌ [KeyUtils] Error deriving shared secret:", error);
      console.groupEnd();
      throw error;
    }
  }
  async deriveSessionKey(sharedSecret, salt = null) {
    try {
      if (!salt) {
        salt = window.crypto.getRandomValues(new Uint8Array(16));
      }

      const sessionKey = await window.crypto.subtle.deriveKey(
        {
          name: "HKDF",
          salt: salt,
          hash: "SHA-256",
          info: new Uint8Array([0x45, 0x32, 0x45]), // "E2E" in hex
        },
        sharedSecret,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      return {
        key: sessionKey,
        salt: Array.from(salt),
      };
    } catch (error) {
      console.error("❌ [KeyUtils] Error deriving session key:", error);
      throw error;
    }
  }

  // ======================= KEY VALIDATION =======================

  validateKeyFormat(key, expectedType = "ecdh") {
    try {
      if (!key) {
        return false;
      }

      // Check if it's a JWK
      if (typeof key === "string" && key.startsWith("{")) {
        try {
          const jwk = JSON.parse(key);
          if (expectedType === "ecdh") {
            return jwk.kty === "EC" && jwk.crv === "P-256";
          } else if (expectedType === "rsa") {
            return jwk.kty === "RSA" && jwk.e && jwk.n;
          }
        } catch (e) {
          return false;
        }
      }

      // Check if it's PEM format
      if (typeof key === "string" && key.includes("-----BEGIN")) {
        return key.includes("PUBLIC KEY") || key.includes("PRIVATE KEY");
      }

      // Check if it's a CryptoKey object
      if (key instanceof CryptoKey) {
        return true;
      }

      // Check if it's a hex string (for symmetric keys)
      if (typeof key === "string" && /^[0-9a-fA-F]+$/.test(key)) {
        return key.length >= 32;
      }

      return false;
    } catch (error) {
      console.error("❌ [KeyUtils] Error validating key format:", error);
      return false;
    }
  }

  // ======================= UTILITY FUNCTIONS =======================

  arrayBufferToBase64(buffer) {
    try {
      let binary = "";
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return window.btoa(binary);
    } catch (error) {
      console.error(
        "❌ [KeyUtils] Error converting ArrayBuffer to Base64:",
        error
      );
      throw error;
    }
  }

  base64ToArrayBuffer(base64) {
    try {
      if (!base64) {
        throw new Error("Base64 string is empty");
      }

      let cleaned = base64.replace(/\s+/g, "");
      cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, "");

      while (cleaned.length % 4 !== 0) {
        cleaned += "=";
      }

      if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
        throw new Error("Invalid base64 format");
      }

      const binary = window.atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      return bytes.buffer;
    } catch (error) {
      console.error(
        "❌ [KeyUtils] Error converting Base64 to ArrayBuffer:",
        error
      );
      throw error;
    }
  }

  // ======================= KEY ANALYSIS =======================

  analyzeKey(key) {
    try {
      const analysis = {
        type: "unknown",
        size: 0,
        format: "unknown",
        isAsymmetric: false,
        isSymmetric: false,
        isPublic: false,
        isPrivate: false,
        isValid: false,
      };

      if (typeof key === "string") {
        analysis.format = "string";

        // Try to parse as JWK
        if (key.startsWith("{")) {
          try {
            const jwk = JSON.parse(key);
            analysis.type = jwk.kty || "unknown";
            analysis.isAsymmetric = jwk.kty === "EC" || jwk.kty === "RSA";
            analysis.isSymmetric = jwk.kty === "oct";
            analysis.isPublic = !jwk.d;
            analysis.isPrivate = !!jwk.d;
            analysis.size = jwk.n ? jwk.n.length * 4 : 0;

            if (jwk.kty === "EC" && jwk.crv === "P-256") {
              analysis.size = 256;
            }

            analysis.isValid = true;
          } catch (e) {
            // Not JWK
          }
        }

        // Check if hex string (symmetric key)
        if (/^[0-9a-fA-F]+$/.test(key)) {
          analysis.type = "symmetric";
          analysis.isSymmetric = true;
          analysis.size = key.length * 4;
          analysis.isValid = true;
        }
      } else if (key instanceof CryptoKey) {
        analysis.format = "CryptoKey";
        analysis.type = key.algorithm.name;
        analysis.isAsymmetric = ["ECDH", "RSA-OAEP"].includes(key.type);
        analysis.isSymmetric = key.algorithm.name.includes("AES");
        analysis.isPublic = key.type === "public";
        analysis.isPrivate = key.type === "private";
        analysis.size = key.algorithm.length || 0;
        analysis.isValid = true;
      }

      return analysis;
    } catch (error) {
      console.error("❌ [KeyUtils] Error analyzing key:", error);
      return {
        type: "error",
        isValid: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
const keyUtils = new KeyUtils();
export default keyUtils;
