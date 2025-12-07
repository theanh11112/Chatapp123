import CryptoJS from "crypto-js";

/**
 * Basic cryptographic utilities and fallback functions
 * Only contains operations that don't require Web Crypto API
 */

export class CryptoUtils {
  // Random IV generation
  static generateIV() {
    if (window.crypto && window.crypto.getRandomValues) {
      const iv = new Uint8Array(12);
      window.crypto.getRandomValues(iv);
      return Array.from(iv)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      // Fallback
      return CryptoJS.lib.WordArray.random(12).toString();
    }
  }

  // Generate random key (for symmetric encryption)
  static generateRandomKey(length = 32) {
    if (window.crypto && window.crypto.getRandomValues) {
      const key = new Uint8Array(length);
      window.crypto.getRandomValues(key);
      return Array.from(key)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      return CryptoJS.lib.WordArray.random(length).toString();
    }
  }

  // Simple hash function for fingerprints
  static hashString(str) {
    return CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex).substring(0, 16);
  }

  // Derive key from password/passphrase
  static deriveKey(password, salt) {
    return CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000,
    }).toString();
  }

  // Symmetric encryption (fallback)
  static encryptSymmetric(plaintext, key, iv) {
    try {
      const ivWordArray = iv
        ? CryptoJS.enc.Hex.parse(iv)
        : CryptoJS.lib.WordArray.random(16);
      const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
        iv: ivWordArray,
      });

      return {
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        iv: ivWordArray.toString(),
        algorithm: "AES-CBC",
      };
    } catch (error) {
      console.error("Symmetric encryption error:", error);
      throw error;
    }
  }

  // Symmetric decryption (fallback)
  static decryptSymmetric(ciphertext, key, iv) {
    try {
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: CryptoJS.enc.Base64.parse(ciphertext) },
        key,
        { iv: CryptoJS.enc.Hex.parse(iv) }
      );

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("Symmetric decryption error:", error);
      throw error;
    }
  }

  // Validate public key format
  static validatePublicKey(publicKey) {
    if (!publicKey) return false;

    try {
      // Check if it's a JSON Web Key
      if (publicKey.startsWith("{")) {
        const jwk = JSON.parse(publicKey);
        return jwk && jwk.kty && jwk.crv;
      }

      // Check if it's PEM format
      if (publicKey.includes("-----BEGIN")) {
        return true;
      }

      // Assume it's base64 encoded
      return publicKey.length > 50;
    } catch (error) {
      return false;
    }
  }

  // Calculate fingerprint for a key
  static calculateFingerprint(key) {
    const hash = CryptoJS.SHA256(key).toString(CryptoJS.enc.Hex);
    return hash.substring(0, 8).toUpperCase();
  }

  // Password-based encryption
  static encryptWithPassword(data, password) {
    try {
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      });

      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      });

      return {
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        salt: salt.toString(CryptoJS.enc.Hex),
        iv: iv.toString(CryptoJS.enc.Hex),
        algorithm: "AES-CBC-256",
      };
    } catch (error) {
      console.error("Password encryption error:", error);
      throw error;
    }
  }

  // Password-based decryption
  static decryptWithPassword(encryptedData, password) {
    try {
      const { ciphertext, salt, iv, algorithm } = encryptedData;

      if (algorithm !== "AES-CBC-256") {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const saltWordArray = CryptoJS.enc.Hex.parse(salt);
      const key = CryptoJS.PBKDF2(password, saltWordArray, {
        keySize: 256 / 32,
        iterations: 10000,
      });

      const ivWordArray = CryptoJS.enc.Hex.parse(iv);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: ivWordArray,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error("Password decryption error:", error);
      throw error;
    }
  }
}

export default CryptoUtils;
