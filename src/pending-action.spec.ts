import { describe, expect, it } from 'vitest'
import {
  PendingActionPayloadSchemas,
  PendingActionResponseSchema,
  UnresolvedFoodResolutionSchema,
} from './pending-action'

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
          allowed: true,
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

describe('UnresolvedFoodPayloadSchema', () => {
  const base = {
    food: 'mozzarella',
    gramsFood: 200,
    mealSlotId: uuid,
    slotLabel: 'Pranzo',
    eatenAt: '2026-08-10T13:00:00+02:00',
    localTz: 'Europe/Rome',
  }
  const candidate = { foodId: uuid, name: 'Mozzarella light', detail: '160 kcal/100 g', personal: false }

  it('i candidati sono facoltativi: la voce unknown non ne ha (D-022)', () => {
    expect(PendingActionPayloadSchemas.unresolved_food.safeParse(base).success).toBe(true)
  })

  it('accetta i candidati di una voce ambigua (D-024)', () => {
    expect(
      PendingActionPayloadSchemas.unresolved_food.safeParse({ ...base, candidates: [candidate] })
        .success,
    ).toBe(true)
  })

  it('rifiuta più di quattro candidati: la lista lunga affoga chi sceglie', () => {
    expect(
      PendingActionPayloadSchemas.unresolved_food.safeParse({
        ...base,
        candidates: Array.from({ length: 5 }, () => candidate),
      }).success,
    ).toBe(false)
  })

  it('rifiuta un candidato senza foodId: senza id la scelta non si risolve', () => {
    const { foodId: _id, ...senzaId } = candidate
    expect(
      PendingActionPayloadSchemas.unresolved_food.safeParse({ ...base, candidates: [senzaId] })
        .success,
    ).toBe(false)
  })

  // R-44: le due letture in conflitto viaggiano con la voce, e con loro
  // `gramsFood` è null — la quantità non è nota, e sceglierla sarebbe indovinare
  it('accetta le due letture della quantità, con i grammi a null', () => {
    expect(
      PendingActionPayloadSchemas.unresolved_food.safeParse({
        ...base,
        gramsFood: null,
        gramsReadings: { fromName: 50, fromField: 500 },
      }).success,
    ).toBe(true)
  })

  it('sono facoltative: le voci accodate prima restano valide', () => {
    expect(PendingActionPayloadSchemas.unresolved_food.safeParse(base).success).toBe(true)
  })

  it('rifiuta una lettura sola: il conflitto è fra due', () => {
    expect(
      PendingActionPayloadSchemas.unresolved_food.safeParse({ ...base, gramsReadings: { fromName: 50 } })
        .success,
    ).toBe(false)
  })
})

describe('UnresolvedFoodResolutionSchema', () => {
  it('basta il foodId: il resto arriva dal payload originale', () => {
    expect(UnresolvedFoodResolutionSchema.safeParse({ foodId: uuid }).success).toBe(true)
  })

  it('accetta le sovrascritture di grammi, slot, ora ed estimation', () => {
    expect(
      UnresolvedFoodResolutionSchema.safeParse({
        foodId: uuid,
        gramsFood: 80,
        mealSlotId: uuid,
        eatenAt: '2026-08-10T07:40:00+02:00',
        estimation: 'estimated_declared',
      }).success,
    ).toBe(true)
  })

  it('rifiuta grammi non positivi e localTz: il fuso non si sovrascrive', () => {
    expect(UnresolvedFoodResolutionSchema.safeParse({ foodId: uuid, gramsFood: 0 }).success).toBe(
      false,
    )
    // il fuso non è nello schema: chi lo manda se lo vede scartare, mai applicare
    const parsed = UnresolvedFoodResolutionSchema.safeParse({ foodId: uuid, localTz: 'Europe/Rome' })
    expect(parsed.success && 'localTz' in parsed.data).toBe(false)
  })

  // D-032: due risposte alla stessa domanda non si mandano insieme, e una
  // risposta ci vuole
  it('«uno vale l\'altro» sta al posto del foodId, non accanto', () => {
    expect(UnresolvedFoodResolutionSchema.safeParse({ anyOfThem: true }).success).toBe(true)
    expect(UnresolvedFoodResolutionSchema.safeParse({ anyOfThem: true, foodId: uuid }).success).toBe(
      false,
    )
    expect(UnresolvedFoodResolutionSchema.safeParse({ gramsFood: 80 }).success).toBe(false)
  })
})
