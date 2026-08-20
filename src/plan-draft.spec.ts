import { describe, expect, it } from 'vitest'
import {
  PlanDraftInputSchema,
  PlanDraftPatchSchema,
  PlanDraftResponseSchema,
  PlanDraftStatusSchema,
} from './plan-draft'

const uuid = '11111111-1111-4111-8111-111111111111'

// la struttura che un documento dichiara: slot, giornate, celle e settimana tipo
const transcription = {
  name: 'Piano del nutrizionista',
  mealSlots: [
    { code: 'colazione', label: 'Colazione', position: 0 },
    { code: 'pranzo', label: 'Pranzo', position: 1 },
  ],
  dayTypes: [{ code: 'standard', label: 'Standard' }],
  slotPrescriptions: [
    { dayTypeCode: 'standard', mealSlotCode: 'pranzo', kind: 'carbs', amount: 80, unit: 'macro_g' },
  ],
  dayTypeRules: [{ dayTypeCode: 'standard', position: 0, condition: 'always', params: null }],
}

describe('PlanDraftStatusSchema', () => {
  it('ammette i tre stati e rifiuta il resto', () => {
    expect(PlanDraftStatusSchema.options).toEqual(['draft', 'promoted', 'discarded'])
    expect(PlanDraftStatusSchema.safeParse('draft').success).toBe(true)
    expect(PlanDraftStatusSchema.safeParse('active').success).toBe(false)
  })
})

describe('PlanDraftInputSchema', () => {
  it('accetta il testo incollato', () => {
    expect(PlanDraftInputSchema.safeParse({ sourceText: 'Colazione: 80 g di avena' }).success).toBe(true)
  })

  it('rifiuta il vuoto, il testo oltre il tetto e le chiavi in più', () => {
    expect(PlanDraftInputSchema.safeParse({ sourceText: '' }).success).toBe(false)
    expect(PlanDraftInputSchema.safeParse({ sourceText: 'a'.repeat(50_001) }).success).toBe(false)
    expect(PlanDraftInputSchema.safeParse({ sourceText: 'ok', name: 'x' }).success).toBe(false)
  })
})

describe('PlanDraftPatchSchema', () => {
  it('accetta la trascrizione intera', () => {
    expect(PlanDraftPatchSchema.safeParse({ transcription }).success).toBe(true)
  })

  it('accetta il validFrom dichiarato dal documento e la sua assenza', () => {
    expect(
      PlanDraftPatchSchema.safeParse({ transcription: { ...transcription, validFrom: '2026-09-01' } })
        .success,
    ).toBe(true)
    expect(
      PlanDraftPatchSchema.safeParse({ transcription: { ...transcription, validFrom: null } }).success,
    ).toBe(true)
  })

  // ⛔ i parametri di calcolo non si trascrivono: li copia la promozione
  it('non riceve i parametri di calcolo del piano', () => {
    const parsed = PlanDraftPatchSchema.safeParse({
      transcription: { ...transcription, deficitKcal: 300 },
    })
    expect(parsed.success).toBe(true)
    expect(parsed.success && 'deficitKcal' in parsed.data.transcription).toBe(false)
  })

  it('applica i vincoli di struttura del piano', () => {
    const parsed = PlanDraftPatchSchema.safeParse({
      transcription: {
        ...transcription,
        dayTypes: [
          { code: 'standard', label: 'Standard' },
          { code: 'standard', label: 'Doppione' },
        ],
      },
    })
    expect(parsed.success).toBe(false)
    expect(parsed.success ? [] : parsed.error.issues.map((i) => i.message)).toContain(
      'Duplicate day type codes',
    )
  })

  it('rifiuta una prescrizione che cita codici inesistenti', () => {
    expect(
      PlanDraftPatchSchema.safeParse({
        transcription: {
          ...transcription,
          slotPrescriptions: [
            { dayTypeCode: 'ignoto', mealSlotCode: 'pranzo', kind: 'carbs', amount: 80, unit: 'macro_g' },
          ],
        },
      }).success,
    ).toBe(false)
  })
})

describe('PlanDraftResponseSchema', () => {
  const base = {
    id: uuid,
    status: 'draft',
    sourceText: 'Colazione: 80 g di avena',
    transcription,
    promotedPlanId: null,
    updatedAt: '2026-08-20T10:00:00Z',
  }

  it('la bozza non ha ancora un piano', () => {
    expect(PlanDraftResponseSchema.safeParse(base).success).toBe(true)
  })

  it('dopo la promozione punta alla versione che ha generato', () => {
    expect(
      PlanDraftResponseSchema.safeParse({ ...base, status: 'promoted', promotedPlanId: uuid }).success,
    ).toBe(true)
  })

  it('rifiuta promotedPlanId assente: null è un fatto, undefined è un buco', () => {
    const { promotedPlanId: _omitted, ...withoutPlanId } = base
    expect(PlanDraftResponseSchema.safeParse(withoutPlanId).success).toBe(false)
  })
})
