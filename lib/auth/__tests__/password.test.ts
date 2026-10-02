import { describe, expect, it } from 'vitest'
import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH, validateNewPassword } from '../password'

describe('validateNewPassword', () => {
  it('accepts a long-enough password', () => {
    expect(validateNewPassword('x'.repeat(MIN_PASSWORD_LENGTH))).toBeNull()
  })
  it('rejects short passwords', () => {
    expect(validateNewPassword('x'.repeat(MIN_PASSWORD_LENGTH - 1))).not.toBeNull()
    expect(validateNewPassword('')).not.toBeNull()
  })
  it('rejects passwords over the bcrypt byte limit (counts bytes, not characters)', () => {
    expect(validateNewPassword('a'.repeat(MAX_PASSWORD_BYTES))).toBeNull()
    expect(validateNewPassword('a'.repeat(MAX_PASSWORD_BYTES + 1))).not.toBeNull()
    // ۴۰ حرف فارسی = ۸۰ بایت UTF-8
    expect(validateNewPassword('س'.repeat(40))).not.toBeNull()
  })
  it('checks the confirmation only when it is provided', () => {
    expect(validateNewPassword('longenough1', 'longenough1')).toBeNull()
    expect(validateNewPassword('longenough1', 'different11')).not.toBeNull()
    expect(validateNewPassword('longenough1')).toBeNull()
  })
})
