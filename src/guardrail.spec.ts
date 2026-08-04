import { describe, expect, it } from 'vitest'
import { GuardrailPatchSchema, GuardrailResponseSchema } from './guardrail'

const uuid = '11111111-1111-4111-8111-111111111111'

const baseResponse = {
  id: uuid,
  code: 'kcal_day',
  isActive: true,
  metric: 'kcal',
  scope: 'day',
  unit: 'absolute',
}

describe('GuardrailResponseSchema', () => {
  it('accetta una risposta con le sole proprieta obbligatorie', () => {
    expect(GuardrailResponseSchema.safeParse(baseResponse).success).toBe(true)
  })

  it('accetta soglie e messaggi null perché nullish', () => {
    expect(
      GuardrailResponseSchema.safeParse({
        ...baseResponse,
        target: null,
        softMin: null,
        hardMax: null,
        softSeverity: null,
        softMessage: null,
      }).success,
    ).toBe(true)
  })

  it('rifiuta metric fuori enum', () => {
    expect(GuardrailResponseSchema.safeParse({ ...baseResponse, metric: 'sodium' }).success).toBe(
      false,
    )
  })

  it('rifiuta scope fuori enum', () => {
    expect(GuardrailResponseSchema.safeParse({ ...baseResponse, scope: 'month' }).success).toBe(
      false,
    )
  })
})

describe('GuardrailPatchSchema', () => {
  it('accetta un patch con una sola soglia', () => {
    expect(GuardrailPatchSchema.safeParse({ softMax: 2500 }).success).toBe(true)
  })

  it('accetta null per rimuovere una banda', () => {
    expect(GuardrailPatchSchema.safeParse({ hardMax: null }).success).toBe(true)
  })

  it('rifiuta un patch vuoto', () => {
    expect(GuardrailPatchSchema.safeParse({}).success).toBe(false)
  })
})
