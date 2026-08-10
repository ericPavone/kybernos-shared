import { describe, expect, it } from 'vitest'
import {
  isPlausibleMeasurement,
  MEASUREMENT_RANGES,
  MeasurementFilterSchema,
  MeasurementInputSchema,
  MeasurementListQuerySchema,
  MeasurementResponseSchema,
  MeasurementSampleSchema,
} from './measurement'

const baseInput = {
  kind: 'weight',
  value: 80.5,
  measuredOn: '2026-08-04',
  localTz: 'Europe/Rome',
}

describe('MeasurementFilterSchema', () => {
  it('accetta un filtro senza kind perché opzionale', () => {
    expect(MeasurementFilterSchema.safeParse({ from: '2026-08-01' }).success).toBe(true)
  })

  it('rifiuta un kind fuori enum', () => {
    expect(MeasurementFilterSchema.safeParse({ kind: 'height' }).success).toBe(false)
  })

  it('rifiuta un to non in formato date', () => {
    expect(MeasurementFilterSchema.safeParse({ to: 'domani' }).success).toBe(false)
  })
})

describe('MeasurementListQuerySchema', () => {
  it('unisce filtro e paginazione applicando i default', () => {
    expect(MeasurementListQuerySchema.parse({ kind: 'weight' })).toEqual({
      kind: 'weight',
      page: 1,
      pageSize: 20,
    })
  })
})

describe('MeasurementInputSchema', () => {
  it('accetta una misurazione valida', () => {
    expect(MeasurementInputSchema.safeParse(baseInput).success).toBe(true)
  })

  it('rifiuta value non positivo', () => {
    expect(MeasurementInputSchema.safeParse({ ...baseInput, value: 0 }).success).toBe(false)
  })

  it('rifiuta measuredOn non in formato date', () => {
    expect(
      MeasurementInputSchema.safeParse({ ...baseInput, measuredOn: '04/08/2026' }).success,
    ).toBe(false)
  })

  it('accetta i bordi del range, inclusi', () => {
    for (const [kind, range] of Object.entries(MEASUREMENT_RANGES)) {
      expect(MeasurementInputSchema.safeParse({ ...baseInput, kind, value: range.min }).success).toBe(true)
      expect(MeasurementInputSchema.safeParse({ ...baseInput, kind, value: range.max }).success).toBe(true)
    }
  })

  it('rifiuta un valore fuori range per ogni kind', () => {
    for (const [kind, range] of Object.entries(MEASUREMENT_RANGES)) {
      expect(MeasurementInputSchema.safeParse({ ...baseInput, kind, value: range.min - 0.1 }).success).toBe(false)
      expect(MeasurementInputSchema.safeParse({ ...baseInput, kind, value: range.max + 0.1 }).success).toBe(false)
    }
  })

  it('porta il messaggio sul campo value, col range del kind', () => {
    const parsed = MeasurementInputSchema.safeParse({ ...baseInput, value: 900 })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues[0].path).toEqual(['value'])
    expect(parsed.error.issues[0].message).toContain('30-250 kg')
  })

  it('applica il range del kind, non uno solo per tutti', () => {
    expect(MeasurementInputSchema.safeParse({ ...baseInput, kind: 'body_fat', value: 18 }).success).toBe(true)
    expect(MeasurementInputSchema.safeParse({ ...baseInput, kind: 'body_fat', value: 90 }).success).toBe(false)
  })
})

describe('MeasurementSampleSchema', () => {
  it('valida la struttura senza applicare il range: lo scarto per campione sta nel service', () => {
    expect(MeasurementSampleSchema.safeParse({ ...baseInput, value: 900 }).success).toBe(true)
  })

  it('rifiuta comunque un valore non positivo', () => {
    expect(MeasurementSampleSchema.safeParse({ ...baseInput, value: -1 }).success).toBe(false)
  })
})

describe('MeasurementResponseSchema', () => {
  // il mapper REST fa un parse su ogni riga letta: le misure fuori range già a
  // DB devono restare leggibili
  it('accetta una riga storica fuori range', () => {
    expect(
      MeasurementResponseSchema.safeParse({
        ...baseInput,
        value: 221,
        id: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true)
  })

  // R-29/R-35: la traccia di correzione a contratto; corrected default false
  it('espone supersededBy e corrected, con corrected a false se assente', () => {
    const parsed = MeasurementResponseSchema.parse({
      ...baseInput,
      id: '11111111-1111-4111-8111-111111111111',
      supersededBy: '22222222-2222-4222-8222-222222222222',
    })
    expect(parsed.supersededBy).toBe('22222222-2222-4222-8222-222222222222')
    expect(parsed.corrected).toBe(false)
  })
})

describe('isPlausibleMeasurement', () => {
  it('è inclusivo sui bordi', () => {
    expect(isPlausibleMeasurement('weight', 30)).toBe(true)
    expect(isPlausibleMeasurement('weight', 250)).toBe(true)
    expect(isPlausibleMeasurement('weight', 29.9)).toBe(false)
    expect(isPlausibleMeasurement('weight', 250.1)).toBe(false)
  })
})
