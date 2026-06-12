export function validatePassword(password: string) {
  return {
    minLength: password.length >= 13,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(validatePassword(password)).every(Boolean);
}
