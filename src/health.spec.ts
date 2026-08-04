import { describe, expect, it } from 'vitest'
import {
  HealthImportResponseSchema,
  HealthMeasurementSampleSchema,
  HealthSamplesInputSchema,
  HealthWorkoutSampleSchema,
} from './health'

const measurementSample = {
  kind: 'weight',
  value: 80,
  measuredOn: '2026-08-04',
  localTz: 'Europe/Rome',
  externalId: 'hk-123',
}

const workoutSample = {
  performedOn: '2026-08-04',
  localTz: 'Europe/Rome',
  kind: 'running',
  externalId: 'hk-456',
}

describe('HealthMeasurementSampleSchema', () => {
  it('accetta una misurazione con externalId', () => {
    expect(HealthMeasurementSampleSchema.safeParse(measurementSample).success).toBe(true)
  })

  it('rifiuta una misurazione senza externalId', () => {
    const { externalId: _e, ...senza } = measurementSample
    expect(HealthMeasurementSampleSchema.safeParse(senza).success).toBe(false)
  })
})

describe('HealthWorkoutSampleSchema', () => {
  it('rifiuta la proprieta sets perché omessa dallo schema', () => {
    expect(
      HealthWorkoutSampleSchema.strict().safeParse({ ...workoutSample, sets: [] }).success,
    ).toBe(false)
  })

  it('accetta un workout sample valido', () => {
    expect(HealthWorkoutSampleSchema.safeParse(workoutSample).success).toBe(true)
  })
})

describe('HealthSamplesInputSchema', () => {
  it('applica array vuoti di default', () => {
    expect(HealthSamplesInputSchema.parse({})).toEqual({ measurements: [], workouts: [] })
  })

  it('rifiuta piu di 10000 measurements', () => {
    const measurements = Array.from({ length: 10001 }, () => measurementSample)
    expect(HealthSamplesInputSchema.safeParse({ measurements }).success).toBe(false)
  })
})

describe('HealthImportResponseSchema', () => {
  it('accetta contatori interi non negativi', () => {
    expect(
      HealthImportResponseSchema.safeParse({
        measurements: { imported: 2, skipped: 0 },
        workouts: { imported: 0, skipped: 1 },
      }).success,
    ).toBe(true)
  })

  it('rifiuta un contatore negativo', () => {
    expect(
      HealthImportResponseSchema.safeParse({
        measurements: { imported: -1, skipped: 0 },
        workouts: { imported: 0, skipped: 0 },
      }).success,
    ).toBe(false)
  })
})
