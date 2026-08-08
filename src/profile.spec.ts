import { describe, expect, it } from 'vitest'
import { HEIGHT_CM_RANGE, HrZoneSchema, ProfileInputSchema } from './profile'

const baseProfile = {
  sex: 'male',
  birthDate: '1993-05-01',
  heightCm: 180,
}

describe('HrZoneSchema', () => {
  it('accetta una zona tra 1 e 5', () => {
    expect(HrZoneSchema.safeParse({ zone: 3, minBpm: 120, maxBpm: 140 }).success).toBe(true)
  })

  it('rifiuta una zona oltre 5', () => {
    expect(HrZoneSchema.safeParse({ zone: 6, minBpm: 120, maxBpm: 140 }).success).toBe(false)
  })
})

describe('ProfileInputSchema', () => {
  it('accetta un profilo con i soli campi obbligatori', () => {
    expect(ProfileInputSchema.safeParse(baseProfile).success).toBe(true)
  })

  it('accetta i campi opzionali a null perché nullish', () => {
    expect(
      ProfileInputSchema.safeParse({
        ...baseProfile,
        trainingYears: null,
        disciplines: null,
        hrMax: null,
        hrZones: null,
        limitations: null,
      }).success,
    ).toBe(true)
  })

  // additivo: i client che non lo mandano restano validi e restano metrici
  it('mette unitSystem a metric quando manca', () => {
    expect(ProfileInputSchema.parse(baseProfile).unitSystem).toBe('metric')
  })

  it('accetta imperial e rifiuta un sistema inventato', () => {
    expect(ProfileInputSchema.parse({ ...baseProfile, unitSystem: 'imperial' }).unitSystem).toBe('imperial')
    expect(ProfileInputSchema.safeParse({ ...baseProfile, unitSystem: 'us' }).success).toBe(false)
  })

  it('rifiuta sex fuori enum', () => {
    expect(ProfileInputSchema.safeParse({ ...baseProfile, sex: 'other' }).success).toBe(false)
  })

  it('rifiuta heightCm non positiva', () => {
    expect(ProfileInputSchema.safeParse({ ...baseProfile, heightCm: 0 }).success).toBe(false)
  })

  it('rifiuta heightCm fuori dai limiti di plausibilità', () => {
    expect(ProfileInputSchema.safeParse({ ...baseProfile, heightCm: 119 }).success).toBe(false)
    expect(ProfileInputSchema.safeParse({ ...baseProfile, heightCm: 231 }).success).toBe(false)
  })

  it('accetta i bordi, inclusi', () => {
    expect(ProfileInputSchema.safeParse({ ...baseProfile, heightCm: HEIGHT_CM_RANGE.min }).success).toBe(true)
    expect(ProfileInputSchema.safeParse({ ...baseProfile, heightCm: HEIGHT_CM_RANGE.max }).success).toBe(true)
  })

  it('rifiuta piu di 50 limitations', () => {
    const limitations = Array.from({ length: 51 }, (_, i) => `lim${i}`)
    expect(ProfileInputSchema.safeParse({ ...baseProfile, limitations }).success).toBe(false)
  })
})
