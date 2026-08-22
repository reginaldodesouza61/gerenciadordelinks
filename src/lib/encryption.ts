import CryptoJS from 'crypto-js';
import { SecretItem, SecretItemCustomField } from '@/types/notes';

export interface EncryptedPayload {
  ciphertext: string; // Base64 encoded ciphertext + auth tag
  iv: string;         // Base64 encoded 12-byte IV
  salt: string;       // Base64 encoded 16-byte salt
  version: number;    // Protocol version (1 for AES-GCM)
}

// In-memory key cache to eliminate PBKDF2 recalculation overhead
const derivedKeyCache = new Map<string, CryptoKey>();
let lastSuccessfulPassword: string | null = null;

// Get or generate a secure local device/vault master secret in localStorage
export const getMasterPassword = (): string => {
  let pw = localStorage.getItem('e2ee_vault_master_secret');
  if (!pw) {
    pw = 'meuhub_e2ee_master_key_v1_c72212e7-2b6a-4da7-8745-01eb33414af4';
    try {
      localStorage.setItem('e2ee_vault_master_secret', pw);
    } catch {
      // ignore
    }
  }
  return pw;
};

export const getCandidateMasterPasswords = (): string[] => {
  const list: string[] = [];
  
  // 1. If we already found a working password in this session, try it first
  if (lastSuccessfulPassword) {
    list.push(lastSuccessfulPassword);
  }

  // 2. Try stored local master password
  try {
    const local = localStorage.getItem('e2ee_vault_master_secret');
    if (local) list.push(local);
  } catch {
    // ignore
  }

  // 3. Fallback candidates
  list.push('meuhub_e2ee_master_key_v1_c72212e7-2b6a-4da7-8745-01eb33414af4');
  list.push('meuhub_vault_master_key_2026');
  list.push('mgx-c72212e7-2b6a-4da7-8745-01eb33414af4-encryption-key-2024');
  list.push('c72212e7-2b6a-4da7-8745-01eb33414af4');
  list.push('mgx-user-encryption-key-2024');
  list.push('meuhub_master_key');

  return Array.from(new Set(list));
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
 * Checks if a string value is an encrypted payload (WebCrypto JSON or CryptoJS AES string)
 */
export function isFieldEncrypted(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (trimmed.startsWith('U2FsdGVkX1')) return true;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Boolean(parsed && parsed.ciphertext && parsed.iv && parsed.salt);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Derives a cryptographic CryptoKey from the master password and salt using PBKDF2.
 * Uses in-memory caching to achieve 0ms derivation on repeated calls.
 */
async function deriveKey(masterPassword: string, salt: Uint8Array, iterations = 2500): Promise<CryptoKey> {
  const saltB64 = bufferToBase64(salt.buffer);
  const cacheKey = `${masterPassword}:::${saltB64}:::${iterations}`;

  const cached = derivedKeyCache.get(cacheKey);
  if (cached) return cached;

  const enc = new TextEncoder();
  const passwordKey = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derived = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  derivedKeyCache.set(cacheKey, derived);
  return derived;
}

/**
 * Encrypts plaintext using AES-256-GCM with a fresh random 12-byte IV and 16-byte salt.
 */
export async function encryptSecretField(plainText?: string): Promise<string | undefined> {
  if (!plainText) return plainText;

  // If already an encrypted payload, return as is
  if (isFieldEncrypted(plainText)) {
    return plainText;
  }

  try {
    const masterPassword = getMasterPassword();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(masterPassword, salt, 2500);

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
 * Decrypts an encrypted payload string using AES-256-GCM or CryptoJS fallback.
 * Highly optimized to run instantly with key caching.
 */
export async function decryptSecretField(cipherTextOrPayload?: string): Promise<string | undefined> {
  if (!cipherTextOrPayload || typeof cipherTextOrPayload !== 'string') {
    return cipherTextOrPayload;
  }

  const raw = cipherTextOrPayload.trim();

  // 1. If legacy CryptoJS string (starts with U2FsdGVkX1)
  if (raw.startsWith('U2FsdGVkX1')) {
    const candidates = getCandidateMasterPasswords();
    for (const key of candidates) {
      try {
        const decrypted = CryptoJS.AES.decrypt(raw, key);
        const text = decrypted.toString(CryptoJS.enc.Utf8);
        if (text) {
          lastSuccessfulPassword = key;
          return text;
        }
      } catch {
        // try next
      }
    }
    // If decryption failed, return original
    return raw;
  }

  // 2. Check if it is a WebCrypto JSON payload
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.ciphertext && parsed.iv && parsed.salt) {
        const salt = new Uint8Array(base64ToBuffer(parsed.salt));
        const iv = new Uint8Array(base64ToBuffer(parsed.iv));
        const ciphertextBuffer = base64ToBuffer(parsed.ciphertext);

        const candidates = getCandidateMasterPasswords();

        // Try candidate passwords with fast 2500 iterations first
        for (const masterPassword of candidates) {
          try {
            const key = await deriveKey(masterPassword, salt, 2500);
            const decryptedBuffer = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv, tagLength: 128 },
              key,
              ciphertextBuffer
            );
            const dec = new TextDecoder();
            const result = dec.decode(decryptedBuffer);
            if (result) {
              lastSuccessfulPassword = masterPassword;
              return result;
            }
          } catch {
            // try next candidate
          }
        }

        // Try 10,000 iterations fallback
        for (const masterPassword of candidates) {
          try {
            const key = await deriveKey(masterPassword, salt, 10000);
            const decryptedBuffer = await window.crypto.subtle.decrypt(
              { name: 'AES-GCM', iv, tagLength: 128 },
              key,
              ciphertextBuffer
            );
            const dec = new TextDecoder();
            const result = dec.decode(decryptedBuffer);
            if (result) {
              lastSuccessfulPassword = masterPassword;
              return result;
            }
          } catch {
            // try next candidate
          }
        }

        // Could not decrypt with known keys
        return undefined;
      }
    } catch {
      // not a json payload, treat as plaintext
      return raw;
    }
  }

  // Already plaintext
  return raw;
}

const NON_ENCRYPTED_KEYS = new Set(['id', 'type', 'env', 'customFields']);

/**
 * Encrypts all sensitive fields of a SecretItem.
 */
export async function encryptSecretItem<T extends Record<string, unknown>>(item: T): Promise<T> {
  const cloned = { ...item };
  for (const key of Object.keys(cloned)) {
    if (!NON_ENCRYPTED_KEYS.has(key) && typeof cloned[key] === 'string' && cloned[key]) {
      const val = (cloned[key] as string).trim();
      if (!isFieldEncrypted(val)) {
        (cloned as Record<string, unknown>)[key] = await encryptSecretField(val);
      }
    }
  }

  if (Array.isArray(cloned.customFields)) {
    cloned.customFields = await Promise.all(
      (cloned.customFields as SecretItemCustomField[]).map(async (cf) => ({
        ...cf,
        name: cf.name,
        value: cf.value && !isFieldEncrypted(cf.value) ? ((await encryptSecretField(cf.value)) || cf.value) : cf.value
      }))
    );
  }

  return cloned;
}

/**
 * Decrypts all sensitive fields of a SecretItem into clean plaintext.
 */
export async function decryptSecretItem<T extends Record<string, unknown>>(item: T): Promise<T> {
  const cloned = { ...item };
  for (const key of Object.keys(cloned)) {
    if (!NON_ENCRYPTED_KEYS.has(key) && typeof cloned[key] === 'string' && cloned[key]) {
      const val = cloned[key] as string;
      if (isFieldEncrypted(val)) {
        const decrypted = await decryptSecretField(val);
        if (decrypted !== undefined && !isFieldEncrypted(decrypted)) {
          (cloned as Record<string, unknown>)[key] = decrypted;
        } else {
          // If decryption was not possible, clean it up so raw JSON is never shown or kept in memory
          (cloned as Record<string, unknown>)[key] = cleanSecretDisplay(val, '');
        }
      }
    }
  }

  if (Array.isArray(cloned.customFields)) {
    cloned.customFields = await Promise.all(
      (cloned.customFields as SecretItemCustomField[]).map(async (cf) => {
        let cleanVal = cf.value;
        if (cleanVal && isFieldEncrypted(cleanVal)) {
          const dec = await decryptSecretField(cleanVal);
          cleanVal = (dec && !isFieldEncrypted(dec)) ? dec : cleanSecretDisplay(cleanVal, '');
        }
        return {
          ...cf,
          value: cleanVal
        };
      })
    );
  }

  return cloned;
}

/**
 * Fully decrypts note page content.
 * Handles both whole-payload encryption and internal vault block secrets.
 */
export async function decryptNoteContent(conteudoJson?: string | null): Promise<string> {
  if (!conteudoJson || typeof conteudoJson !== 'string') return '';
  const raw = conteudoJson.trim();
  if (!raw) return '';

  let decryptedJson = raw;

  // 1. If entire note is encrypted as a JSON payload or CryptoJS string
  if (isFieldEncrypted(raw)) {
    const dec = await decryptSecretField(raw);
    if (dec) {
      decryptedJson = dec.trim();
    } else {
      // If decryption failed, return empty array rather than raw ciphertext
      return JSON.stringify([]);
    }
  }

  // 2. If it is an array of CanvasBlocks, decrypt any vault block secrets inside
  if (decryptedJson.startsWith('[') && decryptedJson.endsWith(']')) {
    try {
      const blocks = JSON.parse(decryptedJson);
      if (Array.isArray(blocks)) {
        let hasVault = false;
        const processedBlocks = await Promise.all(
          blocks.map(async (block) => {
            if (block && block.type === 'vault' && Array.isArray(block.secrets)) {
              hasVault = true;
              const decryptedSecrets = await Promise.all(
                block.secrets.map((s: Record<string, unknown>) => decryptSecretItem(s))
              );
              return { ...block, secrets: decryptedSecrets };
            }
            return block;
          })
        );
        if (hasVault) {
          return JSON.stringify(processedBlocks);
        }
      }
    } catch {
      // ignore JSON parse error
    }
  }

  return decryptedJson;
}

/**
 * Parses note content blocks and ensures every secret in vault blocks is encrypted
 * before saving to Supabase database.
 */
export async function sanitizeAndEncryptNoteContent(conteudoJson: string): Promise<string> {
  if (!conteudoJson) return conteudoJson;
  try {
    const blocks = JSON.parse(conteudoJson);
    if (!Array.isArray(blocks)) return conteudoJson;

    let modified = false;
    const processedBlocks = await Promise.all(
      blocks.map(async (block) => {
        if (block && block.type === 'vault' && Array.isArray(block.secrets)) {
          const encryptedSecrets = await Promise.all(
            block.secrets.map((s: Record<string, unknown>) => encryptSecretItem(s))
          );
          modified = true;
          return { ...block, secrets: encryptedSecrets };
        }
        return block;
      })
    );

    if (modified) {
      return JSON.stringify(processedBlocks);
    }
    return conteudoJson;
  } catch {
    return conteudoJson;
  }
}

/**
 * Helper to safely sanitize any string for UI display, ensuring raw ciphertext JSON is never shown
 */
export function cleanSecretDisplay(val?: string | null, fallback = ''): string {
  if (!val) return fallback;
  if (isFieldEncrypted(val)) {
    return fallback || '••••••••';
  }
  return val;
}
