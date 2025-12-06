import CryptoJS from "crypto-js";

class KeyUtils {
  constructor() {
    console.log("🔑 [KeyUtils] Initialized");
  }

  // 🔄 KEY GENERATION

  async generateECDHKeyPair() {
    try {
      console.log("🔄 [KeyUtils] Generating ECDH key pair...");

      if (!window.crypto || !window.crypto.subtle) {
        throw new Error("Web Crypto API not supported");
      }

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true, // extractable
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
      console.log("🔄 [KeyUtils] Generating RSA key pair...");

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]), // 65537
          hash: "SHA-256",
        },
        true, // extractable
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
      console.log(`🔄 [KeyUtils] Generating symmetric key (${length} bits)...`);

      if (window.crypto && window.crypto.getRandomValues) {
        const keyBytes = length / 8;
        const key = new Uint8Array(keyBytes);
        window.crypto.getRandomValues(key);

        const keyHex = Array.from(key)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        console.log("✅ [KeyUtils] Symmetric key generated");
        return keyHex;
      } else {
        // Fallback
        const key = CryptoJS.lib.WordArray.random(length / 8);
        console.log("✅ [KeyUtils] Symmetric key generated (fallback)");
        return key.toString();
      }
    } catch (error) {
      console.error("❌ [KeyUtils] Error generating symmetric key:", error);
      throw error;
    }
  }

  // 📝 KEY FORMATTING

  async exportKeyToJWK(key) {
    try {
      console.log("📝 [KeyUtils] Exporting key to JWK...");

      const jwk = await window.crypto.subtle.exportKey("jwk", key);
      console.log("✅ [KeyUtils] Key exported to JWK");
      return jwk;
    } catch (error) {
      console.error("❌ [KeyUtils] Error exporting key to JWK:", error);
      throw error;
    }
  }

  async importKeyFromJWK(jwk, keyUsages) {
    try {
      console.log("📝 [KeyUtils] Importing key from JWK...");

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

      console.log("✅ [KeyUtils] Key imported from JWK");
      return key;
    } catch (error) {
      console.error("❌ [KeyUtils] Error importing key from JWK:", error);
      throw error;
    }
  }

  async exportKeyToPEM(key, isPrivate = false) {
    try {
      console.log("📝 [KeyUtils] Exporting key to PEM...");

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

      console.log("✅ [KeyUtils] Key exported to PEM");
      return pem;
    } catch (error) {
      console.error("❌ [KeyUtils] Error exporting key to PEM:", error);
      throw error;
    }
  }

  async importKeyFromPEM(pem, keyUsages, isPrivate = false) {
    try {
      console.log("📝 [KeyUtils] Importing key from PEM...");

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

      console.log("✅ [KeyUtils] Key imported from PEM");
      return key;
    } catch (error) {
      console.error("❌ [KeyUtils] Error importing key from PEM:", error);
      throw error;
    }
  }

  // ✅ KEY VALIDATION

  validateKeyFormat(key, expectedType = "ecdh") {
    try {
      console.log(`✅ [KeyUtils] Validating ${expectedType} key format...`);

      if (!key) {
        throw new Error("Key is empty");
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
          // Not a valid JSON
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
        return key.length >= 32; // At least 128-bit key
      }

      console.warn("⚠️ [KeyUtils] Unknown key format");
      return false;
    } catch (error) {
      console.error("❌ [KeyUtils] Error validating key format:", error);
      return false;
    }
  }

  checkKeyExpiration(keyTimestamp, maxAgeDays = 30) {
    try {
      const now = Date.now();
      const keyAge = now - keyTimestamp;
      const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

      const isExpired = keyAge > maxAge;
      const daysLeft = Math.ceil((maxAge - keyAge) / (24 * 60 * 60 * 1000));

      console.log(
        `📅 [KeyUtils] Key age: ${Math.floor(
          keyAge / (24 * 60 * 60 * 1000)
        )} days, Expired: ${isExpired}`
      );

      return {
        isExpired,
        daysLeft: isExpired ? 0 : daysLeft,
        keyAgeDays: Math.floor(keyAge / (24 * 60 * 60 * 1000)),
      };
    } catch (error) {
      console.error("❌ [KeyUtils] Error checking key expiration:", error);
      return { isExpired: false, daysLeft: 0, keyAgeDays: 0 };
    }
  }

  verifyKeyOwnership(publicKey, signature, data) {
    // This would verify that the key owner signed the data
    // For now, return a placeholder implementation
    console.log("🔐 [KeyUtils] Verifying key ownership (placeholder)");
    return { verified: true, reason: "Placeholder implementation" };
  }

  // 🔗 KEY DERIVATION

  // Sửa hàm deriveSharedSecret trong keyUtils.js
  async deriveSharedSecret(ownPrivateKeyJwk, peerPublicKeyJwk) {
    try {
      console.log("🔗 [KeyUtils] Deriving shared secret...");

      // Đảm bảo đây là JWK objects, không phải strings
      const ownPrivateKey =
        typeof ownPrivateKeyJwk === "string"
          ? JSON.parse(ownPrivateKeyJwk)
          : ownPrivateKeyJwk;

      const peerPublicKey =
        typeof peerPublicKeyJwk === "string"
          ? JSON.parse(peerPublicKeyJwk)
          : peerPublicKeyJwk;

      console.log("🔑 Importing keys...", {
        ownKeyType: typeof ownPrivateKey,
        peerKeyType: typeof peerPublicKey,
        ownHasKty: !!ownPrivateKey.kty,
        peerHasKty: !!peerPublicKey.kty,
      });

      // 1. Import own private key as CryptoKey
      const ownPrivateCryptoKey = await window.crypto.subtle.importKey(
        "jwk",
        ownPrivateKey,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        false,
        ["deriveKey", "deriveBits"]
      );

      // 2. Import peer public key as CryptoKey
      const peerPublicCryptoKey = await window.crypto.subtle.importKey(
        "jwk",
        peerPublicKey,
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        []
      );

      console.log("✅ Keys imported successfully");

      // 3. Derive bits (raw shared secret)
      const rawSharedSecret = await window.crypto.subtle.deriveBits(
        {
          name: "ECDH",
          public: peerPublicCryptoKey,
        },
        ownPrivateCryptoKey,
        256
      );

      console.log("🔄 Converting to CryptoKey...");

      // 4. Convert raw bits to CryptoKey for AES-GCM
      const derivedKey = await window.crypto.subtle.importKey(
        "raw",
        rawSharedSecret,
        {
          name: "AES-GCM",
          length: 256,
        },
        false,
        ["encrypt", "decrypt"]
      );

      console.log("✅ [KeyUtils] Shared secret derived successfully");
      return derivedKey;
    } catch (error) {
      console.error("❌ [KeyUtils] Error deriving shared secret:", error);
      throw error;
    }
  }

  async deriveSessionKey(sharedSecret, salt = null) {
    try {
      console.log("🔗 [KeyUtils] Deriving session key...");

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

      console.log("✅ [KeyUtils] Session key derived");
      return {
        key: sessionKey,
        salt: Array.from(salt),
      };
    } catch (error) {
      console.error("❌ [KeyUtils] Error deriving session key:", error);
      throw error;
    }
  }

  // 🏷️ FINGERPRINT CALCULATION

  calculateFingerprint(key, algorithm = "sha256") {
    try {
      console.log(`🏷️ [KeyUtils] Calculating fingerprint (${algorithm})...`);

      let keyString;

      if (typeof key === "string") {
        keyString = key;
      } else if (key instanceof CryptoKey) {
        // For CryptoKey objects, we need to export first
        keyString = JSON.stringify(key.algorithm);
      } else if (key && typeof key === "object") {
        keyString = JSON.stringify(key);
      } else {
        throw new Error("Unsupported key type for fingerprint calculation");
      }

      let fingerprint;

      if (algorithm === "sha256") {
        const hash = CryptoJS.SHA256(keyString).toString(CryptoJS.enc.Hex);
        fingerprint = hash.substring(0, 16).toUpperCase();
        fingerprint = fingerprint.match(/.{1,4}/g).join(" ");
      } else if (algorithm === "sha1") {
        const hash = CryptoJS.SHA1(keyString).toString(CryptoJS.enc.Hex);
        fingerprint = hash.substring(0, 20).toUpperCase();
        fingerprint = fingerprint.match(/.{1,4}/g).join(" ");
      } else {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      console.log(`✅ [KeyUtils] Fingerprint calculated: ${fingerprint}`);
      return fingerprint;
    } catch (error) {
      console.error("❌ [KeyUtils] Error calculating fingerprint:", error);
      throw error;
    }
  }

  compareFingerprints(fingerprint1, fingerprint2) {
    try {
      // Normalize fingerprints (remove spaces, convert to uppercase)
      const normalized1 = fingerprint1.replace(/\s+/g, "").toUpperCase();
      const normalized2 = fingerprint2.replace(/\s+/g, "").toUpperCase();

      const matches = normalized1 === normalized2;

      console.log(
        `🔍 [KeyUtils] Fingerprint comparison: ${
          matches ? "✅ MATCH" : "❌ MISMATCH"
        }`
      );
      console.log(`   Expected: ${fingerprint1}`);
      console.log(`   Received: ${fingerprint2}`);

      return {
        matches,
        normalized1,
        normalized2,
      };
    } catch (error) {
      console.error("❌ [KeyUtils] Error comparing fingerprints:", error);
      return { matches: false, normalized1: "", normalized2: "" };
    }
  }

  // 📊 KEY ANALYSIS

  analyzeKey(key) {
    try {
      console.log("📊 [KeyUtils] Analyzing key...");

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
            analysis.size = jwk.n ? jwk.n.length * 4 : 0; // Rough estimate for RSA

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
          analysis.size = key.length * 4; // Hex chars to bits
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

      console.log("✅ [KeyUtils] Key analysis complete:", analysis);
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

  // 🧪 KEY TESTING

  async testKeyEncryption(key, testData = "Test encryption") {
    try {
      console.log("🧪 [KeyUtils] Testing key encryption...");

      const encoder = new TextEncoder();
      const data = encoder.encode(testData);

      let encrypted;
      let decrypted;

      if (key.algorithm?.name === "AES-GCM") {
        // Symmetric key test
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        encrypted = await window.crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          data
        );

        decrypted = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          encrypted
        );
      } else if (key.algorithm?.name === "RSA-OAEP") {
        // RSA key test (encrypt with public, decrypt with private)
        if (key.type === "public") {
          encrypted = await window.crypto.subtle.encrypt(
            { name: "RSA-OAEP" },
            key,
            data
          );
          // Can't decrypt with public key
          decrypted = null;
        } else {
          // This would require the corresponding public key
          decrypted = null;
        }
      } else if (key.algorithm?.name === "ECDH") {
        // ECDH key - can't encrypt directly
        encrypted = null;
        decrypted = null;
      }

      const success = decrypted
        ? new TextDecoder().decode(decrypted) === testData
        : encrypted !== null;

      console.log(
        `✅ [KeyUtils] Key encryption test: ${success ? "PASSED" : "FAILED"}`
      );
      return {
        success,
        encrypted: !!encrypted,
        decrypted: !!decrypted,
        canEncrypt: !!encrypted,
        canDecrypt: !!decrypted,
      };
    } catch (error) {
      console.error("❌ [KeyUtils] Error testing key encryption:", error);
      return {
        success: false,
        error: error.message,
        canEncrypt: false,
        canDecrypt: false,
      };
    }
  }
}

// Singleton instance
const keyUtils = new KeyUtils();
export default keyUtils;
