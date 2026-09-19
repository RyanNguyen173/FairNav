export interface PasswordRule {
  id: string
  label: string
  test: (password: string) => boolean
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter', test: (password) => /[A-Z]/.test(password) },
  { id: 'lowercase', label: 'One lowercase letter', test: (password) => /[a-z]/.test(password) },
  { id: 'number', label: 'One number', test: (password) => /\d/.test(password) },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*)',
    test: (password) => /[!@#$%^&*]/.test(password),
  },
]

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}
