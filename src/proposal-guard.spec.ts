import { describe, expect, it } from 'vitest'
import type { GuardrailObservation } from '@kybernos/shared'
import { hardOverage } from './balance'

const obs = (o: Partial<GuardrailObservation>): GuardrailObservation => ({
  guardrailCode: 'kcal_day',
  zone: 'hard',
  direction: 'above',
  certain: true,
  message: null,
  ...o,
})

describe('hardOverage', () => {
  it('trova la violazione rigida certa verso l’alto', () => {
    expect(hardOverage([obs({})])?.guardrailCode).toBe('kcal_day')
  })

  // il giorno incompleto è sotto il floor per definizione: non è colpa della proposta
  it('ignora una violazione verso il basso, anche rigida e certa', () => {
    expect(hardOverage([obs({ direction: 'below' })])).toBeNull()
  })

  it('ignora la zona soft e le violazioni incerte', () => {
    expect(hardOverage([obs({ zone: 'soft' })])).toBeNull()
    expect(hardOverage([obs({ certain: false })])).toBeNull()
  })

  it('nessuna osservazione: niente da bloccare', () => {
    expect(hardOverage([])).toBeNull()
  })

  it('sceglie quella bloccante anche in mezzo ad altre', () => {
    const found = hardOverage([
      obs({ zone: 'soft' }),
      obs({ direction: 'below' }),
      obs({ guardrailCode: 'fat_day' }),
    ])
    expect(found?.guardrailCode).toBe('fat_day')
  })
})
