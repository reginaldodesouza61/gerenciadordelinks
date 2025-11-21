/**
 * Utility functions for password generation and management
 */

// Generate a secure random password
export function generatePassword(
  length: number = 16,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    symbols?: boolean;
  } = {
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  }
): string {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+{}[]|:;<>,.?/~';

  let chars = '';
  if (options.uppercase) chars += uppercaseChars;
  if (options.lowercase) chars += lowercaseChars;
  if (options.numbers) chars += numberChars;
  if (options.symbols) chars += symbolChars;

  // Default to alphanumeric if no options selected
  if (!chars) {
    chars = uppercaseChars + lowercaseChars + numberChars;
  }

  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }

  // Ensure at least one character from each selected option is present
  let finalPassword = password;
  
  if (options.uppercase && !hasUpperCase(password)) {
    const pos = Math.floor(Math.random() * password.length);
    const char = uppercaseChars.charAt(Math.floor(Math.random() * uppercaseChars.length));
    finalPassword = replaceAt(password, pos, char);
  }
  
  if (options.lowercase && !hasLowerCase(finalPassword)) {
    const pos = Math.floor(Math.random() * finalPassword.length);
    const char = lowercaseChars.charAt(Math.floor(Math.random() * lowercaseChars.length));
    finalPassword = replaceAt(finalPassword, pos, char);
  }
  
  if (options.numbers && !hasNumber(finalPassword)) {
    const pos = Math.floor(Math.random() * finalPassword.length);
    const char = numberChars.charAt(Math.floor(Math.random() * numberChars.length));
    finalPassword = replaceAt(finalPassword, pos, char);
  }
  
  if (options.symbols && !hasSymbol(finalPassword)) {
    const pos = Math.floor(Math.random() * finalPassword.length);
    const char = symbolChars.charAt(Math.floor(Math.random() * symbolChars.length));
    finalPassword = replaceAt(finalPassword, pos, char);
  }
  
  return finalPassword;
}

// Check if string has at least one uppercase letter
function hasUpperCase(str: string): boolean {
  return /[A-Z]/.test(str);
}

// Check if string has at least one lowercase letter
function hasLowerCase(str: string): boolean {
  return /[a-z]/.test(str);
}

// Check if string has at least one number
function hasNumber(str: string): boolean {
  return /[0-9]/.test(str);
}

// Check if string has at least one symbol
function hasSymbol(str: string): boolean {
  return /[!@#$%^&*()_+{}[\]|:;<>,.?/~]/.test(str);
}

// Replace character at a specific position in a string
function replaceAt(str: string, index: number, replacement: string): string {
  return str.substring(0, index) + replacement + str.substring(index + 1);
}

// Calculate password strength from 0-100
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  
  let strength = 0;
  
  // Length contribution (up to 40 points)
  strength += Math.min(password.length * 2.5, 40);
  
  // Character variety contribution (up to 60 points)
  if (hasLowerCase(password)) strength += 10;
  if (hasUpperCase(password)) strength += 10;
  if (hasNumber(password)) strength += 15;
  if (hasSymbol(password)) strength += 25;
  
  return Math.min(strength, 100);
}

// Format strength as text
export function getStrengthLabel(strength: number): {
  label: string;
  color: string;
} {
  if (strength >= 80) {
    return { label: 'Excelente', color: 'bg-green-500' };
  } else if (strength >= 60) {
    return { label: 'Boa', color: 'bg-blue-500' };
  } else if (strength >= 40) {
    return { label: 'Razoável', color: 'bg-yellow-500' };
  } else if (strength >= 20) {
    return { label: 'Fraca', color: 'bg-orange-500' };
  } else {
    return { label: 'Muito fraca', color: 'bg-red-500' };
  }
}