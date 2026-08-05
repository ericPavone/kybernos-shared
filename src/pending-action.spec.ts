import { describe, expect, it } from 'vitest'
import { PendingActionPayloadSchemas, PendingActionResponseSchema } from './pending-action'

const uuid = '11111111-1111-4111-8111-111111111111'

describe('PendingActionPayloadSchemas', () => {
  it('valida un payload rule con lo schema RuleInput', () => {
    expect(
      PendingActionPayloadSchemas.rule.safeParse({
        code: 'no-sugar',
        condition: 'always',
        constraintExpr: 'sugars <= 10',
        severity: 'warn',
      }).success,
    ).toBe(true)
  })

  it('valida un payload preference come testo 1..1000', () => {
    expect(PendingActionPayloadSchemas.preference.safeParse({ text: 'meno sale' }).success).toBe(
      true,
    )
  })

  it('rifiuta un payload constraint con testo oltre 1000 caratteri', () => {
    expect(
      PendingActionPayloadSchemas.constraint.safeParse({ text: 'x'.repeat(1001) }).success,
    ).toBe(false)
  })

  it('valida un payload meal con lo schema MealLogInput', () => {
    expect(
      PendingActionPayloadSchemas.meal.safeParse({
        foodId: uuid,
        gramsFood: 100,
        mealSlotId: uuid,
        eatenAt: '2026-08-04T12:30:00+02:00',
        localTz: 'Europe/Rome',
      }).success,
    ).toBe(true)
  })

  it('valida un payload meal arricchito con computed', () => {
    expect(
      PendingActionPayloadSchemas.meal.safeParse({
        foodId: uuid,
        gramsFood: 100,
        mealSlotId: uuid,
        eatenAt: '2026-08-04T12:30:00+02:00',
        localTz: 'Europe/Rome',
        computed: {
          date: '2026-08-04',
          items: [
            {
              foodId: uuid,
              foodName: 'Pane',
              gramsFood: 100,
              kcal: 265,
              proteinG: 9,
              carbsG: 49,
              fatG: 3.2,
            },
          ],
          meal: { kcal: 265, proteinG: 9, carbsG: 49, fatG: 3.2, fiberG: 2.7 },
          slot: null,
          slotError: null,
          projectedDay: null,
          projectedDayError: 'no_plan_for_date',
          observations: [],
        },
      }).success,
    ).toBe(true)
  })

  it('rifiuta un payload food senza nutrienti obbligatori', () => {
    expect(PendingActionPayloadSchemas.food.safeParse({ name: 'Riso' }).success).toBe(false)
  })

  it('rifiuta un payload plan_change malformato', () => {
    expect(PendingActionPayloadSchemas.plan_change.safeParse({ name: 'Piano' }).success).toBe(
      false,
    )
  })
})

describe('PendingActionResponseSchema', () => {
  it('accetta una risposta valida con decidedAt omesso', () => {
    expect(
      PendingActionResponseSchema.safeParse({
        id: uuid,
        kind: 'meal',
        payload: {},
        status: 'pending',
        expiresAt: '2026-08-05T12:00:00+02:00',
        createdAt: '2026-08-04T12:00:00+02:00',
      }).success,
    ).toBe(true)
  })

  it('rifiuta uno status fuori enum', () => {
    expect(
      PendingActionResponseSchema.safeParse({
        id: uuid,
        kind: 'meal',
        payload: {},
        status: 'done',
        expiresAt: '2026-08-05T12:00:00+02:00',
        createdAt: '2026-08-04T12:00:00+02:00',
      }).success,
    ).toBe(false)
  })
})
