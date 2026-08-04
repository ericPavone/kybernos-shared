import { describe, expect, it } from 'vitest'
import { SetLogInputSchema, WorkoutLogInputSchema } from './workout-log'

const baseSet = { exercise: 'Squat', loadKg: 100, sets: 3, reps: 5 }

const baseWorkout = {
  performedOn: '2026-08-04',
  localTz: 'Europe/Rome',
  kind: 'strength',
}

describe('SetLogInputSchema', () => {
  it('accetta un set valido con rir null perché nullish', () => {
    expect(SetLogInputSchema.safeParse({ ...baseSet, rir: null }).success).toBe(true)
  })

  it('rifiuta reps non positive', () => {
    expect(SetLogInputSchema.safeParse({ ...baseSet, reps: 0 }).success).toBe(false)
  })

  it('rifiuta exercise oltre 200 caratteri', () => {
    expect(SetLogInputSchema.safeParse({ ...baseSet, exercise: 'x'.repeat(201) }).success).toBe(
      false,
    )
  })
})

describe('WorkoutLogInputSchema', () => {
  it('accetta un workout con i soli campi obbligatori', () => {
    expect(WorkoutLogInputSchema.safeParse(baseWorkout).success).toBe(true)
  })

  it('accetta i campi opzionali a null perché nullish', () => {
    expect(
      WorkoutLogInputSchema.safeParse({
        ...baseWorkout,
        durationMin: null,
        activeKcal: null,
        sets: null,
      }).success,
    ).toBe(true)
  })

  it('rifiuta performedOn non in formato date', () => {
    expect(
      WorkoutLogInputSchema.safeParse({ ...baseWorkout, performedOn: 'ieri' }).success,
    ).toBe(false)
  })

  it('rifiuta piu di 200 sets', () => {
    const sets = Array.from({ length: 201 }, () => baseSet)
    expect(WorkoutLogInputSchema.safeParse({ ...baseWorkout, sets }).success).toBe(false)
  })
})
