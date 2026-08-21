import CryptoJS from 'crypto-js';
import { SecretItemCustomField } from '@/types/notes';

// Get or generate a local vault encryption key unique to this browser/session
const getVaultKey = (): string => {
  let key = localStorage.getItem('vault_master_key');
  if (!key) {
    key = CryptoJS.lib.WordArray.random(256 / 8).toString();
    localStorage.setItem('vault_master_key', key);
  }
  return key;
};

export const encryptSecretField = (plainText?: string): string | undefined => {
  if (!plainText || plainText.startsWith('U2FsdGVkX1')) return plainText; // already encrypted or empty
  try {
    const key = getVaultKey();
    return CryptoJS.AES.encrypt(plainText, key).toString();
  } catch (err) {
    console.error('Encryption error:', err);
    return plainText;
  }
};

export const decryptSecretField = (cipherText?: string): string | undefined => {
  if (!cipherText) return cipherText;
  if (!cipherText.startsWith('U2FsdGVkX1')) return cipherText; // not encrypted (legacy or plain)
  try {
    const key = getVaultKey();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch (err) {
    console.error('Decryption error:', err);
    return cipherText;
  }
};

export const encryptSecretItem = <T extends Record<string, unknown>>(item: T): T => {
  const sensitiveKeys = [
    'value', 'password', 'transactionPassword', 'clientSecret', 
    'dbPassword', 'token', 'jwtSecret', 'pixKey', 'cardNumber', 'cardCvv', 'customFields'
  ];

  const cloned = { ...item };
  for (const key of sensitiveKeys) {
    if (cloned[key] && typeof cloned[key] === 'string') {
      (cloned as Record<string, unknown>)[key] = encryptSecretField(cloned[key] as string);
    }
  }

  if (Array.isArray(cloned.customFields)) {
    cloned.customFields = (cloned.customFields as SecretItemCustomField[]).map((cf) => ({
      ...cf,
      value: encryptSecretField(cf.value) || ''
    }));
  }

  return cloned;
};

export const decryptSecretItem = <T extends Record<string, unknown>>(item: T): T => {
  const sensitiveKeys = [
    'value', 'password', 'transactionPassword', 'clientSecret', 
    'dbPassword', 'token', 'jwtSecret', 'pixKey', 'cardNumber', 'cardCvv', 'customFields'
  ];

  const cloned = { ...item };
  for (const key of sensitiveKeys) {
    if (cloned[key] && typeof cloned[key] === 'string') {
      (cloned as Record<string, unknown>)[key] = decryptSecretField(cloned[key] as string);
    }
  }

  if (Array.isArray(cloned.customFields)) {
    cloned.customFields = (cloned.customFields as SecretItemCustomField[]).map((cf) => ({
      ...cf,
      value: decryptSecretField(cf.value) || ''
    }));
  }

  return cloned;
};
