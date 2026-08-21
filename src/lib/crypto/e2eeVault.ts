/**
 * End-to-End Encryption (E2EE) Vault Module
 * Using Native Web Crypto API (window.crypto.subtle), AES-256-GCM, and PBKDF2 (600,000 iterations).
 */

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded ciphertext + auth tag
  iv: string;         // Base64 encoded 12-byte IV
  salt: string;       // Base64 encoded 16-byte salt
  version: number;    // Protocol version (1 for AES-GCM)
}

// Helper: ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a cryptographic CryptoKey from the user's master password and salt using PBKDF2 (600,000 iterations).
 */
export async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 600000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext using AES-256-GCM with a fresh random 12-byte IV and provided salt.
 */
export async function encrypt(plaintext: string, masterPassword: string, existingSalt?: Uint8Array): Promise<EncryptedPayload> {
  const salt = existingSalt || window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);

  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    encodedPlaintext
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    version: 1,
  };
}

/**
 * Decrypts an EncryptedPayload using the master password.
 * Throws a secure error if decryption/authentication fails.
 */
export async function decrypt(payload: EncryptedPayload, masterPassword: string): Promise<string> {
  try {
    const salt = new Uint8Array(base64ToBuffer(payload.salt));
    const iv = new Uint8Array(base64ToBuffer(payload.iv));
    const ciphertextBuffer = base64ToBuffer(payload.ciphertext);

    const key = await deriveKey(masterPassword, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertextBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed or authentication tag mismatch:', error);
    throw new Error('Falha na descriptografia: Senha incorreta ou dados corrompidos/violados.');
  }
}
