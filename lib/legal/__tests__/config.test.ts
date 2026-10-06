import { describe, expect, it } from 'vitest'
import { LEGAL, isLegalConfigured, isRealEmail, missingLegalFields, type LegalConfig } from '../config'

const filled: LegalConfig = { ...LEGAL, operatorName: 'نام', contactEmail: 'a@b.co', governingLaw: 'قانون' }

describe('legal config', () => {
  it('reports exactly which required fields are still empty', () => {
    expect(missingLegalFields({ ...filled, contactEmail: '  ' })).toEqual(['contactEmail'])
    expect(missingLegalFields({ ...LEGAL, operatorName: '', contactEmail: '', governingLaw: '' })).toEqual(['operatorName', 'contactEmail', 'governingLaw'])
  })
  it('is configured only when every required field has content', () => {
    expect(isLegalConfigured(filled)).toBe(true)
    expect(isLegalConfigured({ ...filled, operatorName: '' })).toBe(false)
  })
  it('treats placeholder and malformed contact emails as not filled', () => {
    for (const bad of ['contact@example.com', 'me@sub.example.org', 'not-an-email', 'a@b', 'a b@c.com']) {
      expect(isRealEmail(bad), bad).toBe(false)
      expect(isLegalConfigured({ ...filled, contactEmail: bad }), bad).toBe(false)
      expect(missingLegalFields({ ...filled, contactEmail: bad }), bad).toEqual(['contactEmail'])
    }
    expect(isRealEmail('hello@mydomain.de')).toBe(true)
  })
  it('uses an ISO date and a matching terms version', () => {
    expect(LEGAL.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(LEGAL.termsVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
