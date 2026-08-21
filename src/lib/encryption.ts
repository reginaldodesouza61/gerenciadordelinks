import { SecretItemCustomField } from '@/types/notes';

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded ciphertext + auth tag
  iv: string;         // Base64 encoded 12-byte IV
  salt: string;       // Base64 encoded 16-byte salt
  version: number;    // Protocol version (1 for AES-GCM)
}

// Get or generate a secure local device/vault master secret in localStorage
const getMasterPassword = (): string => {
  let pw = localStorage.getItem('e2ee_vault_master_secret');
  if (!pw) {
    const arr = new Uint8Array(32);
    window.crypto.getRandomValues(arr);
    pw = Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem('e2ee_vault_master_secret', pw);
  }
  return pw;
};

// Helper: ArrayBuffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Helper: Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives a cryptographic CryptoKey from the master password and salt using PBKDF2 (600,000 iterations, SHA-256).
 */
async function deriveKey(masterPassword: string, salt: Uint8Array): Promise<CryptoKey> {
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
 * Encrypts plaintext using AES-256-GCM with a fresh random 12-byte IV and 16-byte salt.
 */
export async function encryptSecretField(plainText?: string): Promise<string | undefined> {
  if (!plainText) return plainText;

  // If already a valid JSON E2EE payload, return as is
  try {
    const parsed = JSON.parse(plainText);
    if (parsed && parsed.ciphertext && parsed.iv && parsed.salt) {
      return plainText;
    }
  } catch {
    // not JSON, proceed to encrypt
  }

  try {
    const masterPassword = getMasterPassword();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(masterPassword, salt);

    const enc = new TextEncoder();
    const encoded = enc.encode(plainText);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      encoded
    );

    const payload: EncryptedPayload = {
      ciphertext: bufferToBase64(ciphertextBuffer),
      iv: bufferToBase64(iv),
      salt: bufferToBase64(salt),
      version: 1,
    };

    return JSON.stringify(payload);
  } catch (err) {
    console.error('Web Crypto Encryption error:', err);
    return plainText;
  }
}

/**
 * Decrypts an encrypted payload JSON string using AES-256-GCM.
 */
export async function decryptSecretField(cipherTextOrPayload?: string): Promise<string | undefined> {
  if (!cipherTextOrPayload) return cipherTextOrPayload;

  // If legacy CryptoJS (U2FsdGVkX1...), return as is or handle
  if (cipherTextOrPayload.startsWith('U2FsdGVkX1')) {
    return cipherTextOrPayload;
  }

  try {
    const parsed = JSON.parse(cipherTextOrPayload);
    if (!parsed || !parsed.ciphertext || !parsed.iv || !parsed.salt) {
      return cipherTextOrPayload; // Plain text or not our payload format
    }

    const masterPassword = getMasterPassword();
    const salt = new Uint8Array(base64ToBuffer(parsed.salt));
    const iv = new Uint8Array(base64ToBuffer(parsed.iv));
    const ciphertextBuffer = base64ToBuffer(parsed.ciphertext);

    const key = await deriveKey(masterPassword, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      key,
      ciphertextBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    // If decryption failed or not encrypted JSON, return original
    return cipherTextOrPayload;
  }
}

export async function encryptSecretItem<T extends Record<string, unknown>>(item: T): Promise<T> {
  const sensitiveKeys = [
    'value', 'password', 'transactionPassword', 'clientSecret', 
    'dbPassword', 'token', 'jwtSecret', 'pixKey', 'cardNumber', 'cardCvv', 'customFields'
  ];

  const cloned = { ...item };
  for (const key of sensitiveKeys) {
    if (cloned[key] && typeof cloned[key] === 'string') {
      (cloned as Record<string, unknown>)[key] = await encryptSecretField(cloned[key] as string);
    }
  }

  if (Array.isArray(cloned.customFields)) {
    cloned.customFields = await Promise.all(
      (cloned.customFields as SecretItemCustomField[]).map(async (cf) => ({
        ...cf,
        value: (await encryptSecretField(cf.value)) || ''
      }))
    );
  }

  return cloned;
}

export async function decryptSecretItem<T extends Record<string, unknown>>(item: T): Promise<T> {
  const sensitiveKeys = [
    'value', 'password', 'transactionPassword', 'clientSecret', 
    'dbPassword', 'token', 'jwtSecret', 'pixKey', 'cardNumber', 'cardCvv', 'customFields'
  ];

  const cloned = { ...item };
  for (const key of sensitiveKeys) {
    if (cloned[key] && typeof cloned[key] === 'string') {
      (cloned as Record<string, unknown>)[key] = await decryptSecretField(cloned[key] as string);
    }
  }

  if (Array.isArray(cloned.customFields)) {
    cloned.customFields = await Promise.all(
      (cloned.customFields as SecretItemCustomField[]).map(async (cf) => ({
        ...cf,
        value: (await decryptSecretField(cf.value)) || ''
      }))
    );
  }

  return cloned;
}
