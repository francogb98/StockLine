/**
 * Password validation utilities for client-side use
 * Uses a simple but effective password validation without requiring bcrypt
 */

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and error message
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  if (!password) {
    return { isValid: false, error: "La contraseña es requerida" };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      error: "La contraseña debe tener al menos 6 caracteres",
    };
  }

  return { isValid: true };
}

/**
 * Check if password contains at least one number
 * @param password - Password to check
 * @returns True if password contains at least one number
 */
export function hasNumber(password: string): boolean {
  return /\d/.test(password);
}

/**
 * Check if password contains at least one special character
 * @param password - Password to check
 * @returns True if password contains at least one special character
 */
export function hasSpecialChar(password: string): boolean {
  return /[!@#$%^&*(),.?":{}|<>]/.test(password);
}

/**
 * Check if password contains at least one uppercase letter
 * @param password - Password to check
 * @returns True if password contains at least one uppercase letter
 */
export function hasUppercase(password: string): boolean {
  return /[A-Z]/.test(password);
}

/**
 * Check if password contains at least one lowercase letter
 * @param password - Password to check
 * @returns True if password contains at least one lowercase letter
 */
export function hasLowercase(password: string): boolean {
  return /[a-z]/.test(password);
}
