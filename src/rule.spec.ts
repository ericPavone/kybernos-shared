import { describe, expect, it } from 'vitest'
import { RuleInputSchema } from './rule'

const baseRule = {
  code: 'no-sugar',
  condition: 'meal.slot == "breakfast"',
  constraintExpr: 'sugars <= 10',
  severity: 'warn',
}

describe('RuleInputSchema', () => {
  it('applica isActive true di default', () => {
    expect(RuleInputSchema.parse(baseRule).isActive).toBe(true)
  })

  it('accetta exceptions e note null perché nullish', () => {
    expect(
      RuleInputSchema.safeParse({ ...baseRule, exceptions: null, note: null }).success,
    ).toBe(true)
  })

  it('rifiuta severity fuori enum', () => {
    expect(RuleInputSchema.safeParse({ ...baseRule, severity: 'fatal' }).success).toBe(false)
  })

  it('rifiuta condition oltre 2000 caratteri', () => {
    expect(
      RuleInputSchema.safeParse({ ...baseRule, condition: 'x'.repeat(2001) }).success,
    ).toBe(false)
  })

  it('rifiuta piu di 50 exceptions', () => {
    const exceptions = Array.from({ length: 51 }, (_, i) => `ex${i}`)
    expect(RuleInputSchema.safeParse({ ...baseRule, exceptions }).success).toBe(false)
  })
})
