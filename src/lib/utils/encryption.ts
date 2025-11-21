import CryptoJS from 'crypto-js';

// Chave de criptografia baseada no usuário (em produção, use uma chave mais segura)
const getEncryptionKey = (userId: string): string => {
  // Em produção, você deveria usar uma chave mais segura
  // Por exemplo, derivada de uma chave mestra + salt do usuário
  return `mgx-${userId}-encryption-key-2024`;
};

export const encryptPassword = (password: string, userId: string): string => {
  try {
    const key = getEncryptionKey(userId);
    const encrypted = CryptoJS.AES.encrypt(password, key).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting password:', error);
    throw new Error('Falha ao criptografar senha');
  }
};

export const decryptPassword = (encryptedPassword: string, userId: string): string => {
  try {
    const key = getEncryptionKey(userId);
    const decrypted = CryptoJS.AES.decrypt(encryptedPassword, key);
    const originalPassword = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!originalPassword) {
      throw new Error('Falha na descriptografia');
    }
    
    return originalPassword;
  } catch (error) {
    console.error('Error decrypting password:', error);
    throw new Error('Falha ao descriptografar senha');
  }
};

// Função para verificar se uma string está criptografada
export const isEncrypted = (text: string): boolean => {
  // Verifica se o texto parece ser uma string criptografada AES
  // Strings AES criptografadas geralmente são base64 e têm um padrão específico
  try {
    return text.length > 20 && /^[A-Za-z0-9+/]+=*$/.test(text);
  } catch {
    return false;
  }
};