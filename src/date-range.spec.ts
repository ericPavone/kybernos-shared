import { describe, expect, it } from 'vitest'
import { DateRangeSchema } from './date-range'

describe('DateRangeSchema', () => {
  it('accetta un range con from e to in formato date', () => {
    expect(DateRangeSchema.parse({ from: '2026-01-01', to: '2026-01-31' })).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    })
  })

  it('accetta un oggetto vuoto perché from e to sono opzionali', () => {
    expect(DateRangeSchema.safeParse({}).success).toBe(true)
  })

  it('rifiuta una data non in formato YYYY-MM-DD', () => {
    expect(DateRangeSchema.safeParse({ from: '01/01/2026' }).success).toBe(false)
  })
})
