import { describe, expect, it } from 'vitest'
import { FLOOR_REQUEST_EVENT, ObservedConcernCodeSchema } from './concern'

describe('ObservedConcernCodeSchema', () => {
  // enum chiuso: il modello registra in una categoria, non ne inventa
  it('ammette i quattro codici di §6.1', () => {
    for (const code of ['guilt', 'single_food_fixation', 'social_avoidance', 'compensation']) {
      expect(ObservedConcernCodeSchema.safeParse(code).success).toBe(true)
    }
  })

  it('rifiuta un codice inventato', () => {
    expect(ObservedConcernCodeSchema.safeParse('sadness').success).toBe(false)
  })
})

describe('FLOOR_REQUEST_EVENT', () => {
  // singolare: è l'accaduto. Il segnale è `floor_requests`, che nasce dalla soglia
  it('non si confonde col codice del segnale', () => {
    expect(FLOOR_REQUEST_EVENT).toBe('floor_request')
    expect(FLOOR_REQUEST_EVENT).not.toBe('floor_requests')
  })
})
