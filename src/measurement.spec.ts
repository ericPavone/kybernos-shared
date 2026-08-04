import { describe, expect, it } from 'vitest'
import {
  MeasurementFilterSchema,
  MeasurementInputSchema,
  MeasurementListQuerySchema,
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
})
