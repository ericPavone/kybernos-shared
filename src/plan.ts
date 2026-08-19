import { z } from 'zod'

export const BmrFormulaSchema = z.enum(['cunningham', 'harris_benedict', 'mifflin'])
export const CarbUnitSchema = z.enum(['food_weight', 'macro_grams'])
export const PlanPrioritySchema = z.enum(['muscle', 'fat_loss', 'performance'])
export const DayTypeRuleConditionSchema = z.enum([
  'workout_kind_in',
  'workout_present',
  'weekday',
  'always',
])
export const SlotPrescriptionKindSchema = z.enum([
  'carbs',
  'protein',
  'fruit',
  'vegetables',
  'added_fat',
  'cheese',
  'cold_cuts',
  'other',
])
// food_g = peso alimento (citazione dal piano), macro_g = grammi di macro,
// free = prescrizione senza quantità («verdura a volontà»),
// volume_ml = volume dichiarato in millilitri.
// ⚠️ L'enum distingue GRANDEZZE, non SCALE (D-050): `cl` e `l` sono lo stesso
// volume in altre scale e non entrano qui — la scala dichiarata è dato di
// presentazione e vuole una colonna sua, come `declared_ml` nella registrazione.
export const SlotPrescriptionUnitSchema = z.enum(['food_g', 'macro_g', 'free', 'volume_ml'])

// D-013/U3: l'orario dello slot è **solo l'inizio**. La fine è l'inizio del
// successivo, quindi buchi e sovrapposizioni non sono rappresentabili: con due
// campi «pranzo finisce alle 15, spuntino comincia alle 16» chiederebbe una
// regola per decidere dove cade un pasto delle 15:30, cioè l'indovinello che
// U3 toglie. `null` = orario non dichiarato, che è un fatto e non un default
export const slotStartsAt = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'orario nella forma HH:MM')

export const MealSlotInputSchema = z.object({
  code: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  position: z.number().int().nonnegative(),
  startsAt: slotStartsAt.nullish(),
  allowedCategories: z.array(z.string().max(100)).max(50).nullish(),
  referenceFoodId: z.string().uuid().nullish(),
})

// D-034: la kcal attiva **attesa** del tipo di giornata — la sorgente 1, quella
// che fa variare il bersaglio per giorno senza registrare niente. `null` = il
// tipo di giornata non promette nessun lavoro (riposo)
export const expectedActiveKcal = z.number().int().nonnegative().max(5000)

export const DayTypeInputSchema = z.object({
  code: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  expectedActiveKcal: expectedActiveKcal.nullish(),
})

const prescriptionKey = {
  dayTypeCode: z.string().min(1).max(100),
  mealSlotCode: z.string().min(1).max(100),
}

const prescriptionCore = {
  kind: SlotPrescriptionKindSchema,
  amount: z.number().nonnegative().nullish(),
  unit: SlotPrescriptionUnitSchema,
  note: z.string().max(200).nullish(),
}

// amount è valorizzato se e solo se l'unità non è `free` (stesso invariante del
// CHECK a DB): senza il discriminante peso alimento e grammi di macro sarebbero
// ambigui nella stessa riga (§4.1)
const refineFreeAmount = (
  p: { amount?: number | null; unit: z.infer<typeof SlotPrescriptionUnitSchema> },
  ctx: z.RefinementCtx,
) => {
  if ((p.unit === 'free') !== (p.amount == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amount'],
      message: 'amount is required unless unit is «free», and forbidden when it is',
    })
  }
}

export const SlotPrescriptionSchema = z.object(prescriptionCore).superRefine(refineFreeAmount)

export const SlotPrescriptionInputSchema = z
  .object({ ...prescriptionKey, ...prescriptionCore })
  .superRefine(refineFreeAmount)

// La cella (slot × giornata) è l'unità di scrittura: si sostituisce intera, in
// una sola richiesta, come la settimana tipo con DayTypeRulesPutSchema. Scriverla
// riga per riga la lascerebbe a metà se una delle scritture fallisse.
// R-08: il body descrive lo stato finale della cella — `unprescribed: true`
// marca «pasto non previsto in questa giornata» (scelta, non buco) e pretende
// la cella vuota; scrivere prescrizioni toglie il marcatore.
export const SlotPrescriptionsPutSchema = z
  .object({
    ...prescriptionKey,
    prescriptions: z
      .array(SlotPrescriptionSchema)
      .max(SlotPrescriptionKindSchema.options.length),
    unprescribed: z.boolean().optional(),
  })
  .superRefine((cell, ctx) => {
    const seen = new Set<string>()
    for (const p of cell.prescriptions) {
      if (seen.has(p.kind)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate prescription kind: ${p.kind}` })
      }
      seen.add(p.kind)
    }
    if (cell.unprescribed === true && cell.prescriptions.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unprescribed'],
        message: 'an unprescribed cell cannot carry prescriptions',
      })
    }
  })

export const DayTypeRuleInputSchema = z.object({
  dayTypeCode: z.string().min(1).max(100),
  position: z.number().int().nonnegative(),
  condition: DayTypeRuleConditionSchema,
  params: z.record(z.unknown()).nullish(),
})

// CR 4 ago 2026: slot, giornate e settimana tipo sono configurazione del piano
// attivo, sempre modificabile — il piano versionato resta la linea guida
export const MealSlotPatchSchema = z.object({
  label: z.string().min(1).max(200).nullish(),
  position: z.number().int().nonnegative().nullish(),
  startsAt: slotStartsAt.nullish(),
  allowedCategories: z.array(z.string().max(100)).max(50).nullish(),
  referenceFoodId: z.string().uuid().nullish(),
})

export const DayTypePatchSchema = z.object({
  label: z.string().min(1).max(200),
  // D-034: `null` esplicito = questa giornata non promette nessun lavoro
  expectedActiveKcal: expectedActiveKcal.nullish(),
})

const planParams = {
  name: z.string().min(1).max(200),
  validFrom: z.string().date(),
  bmrFormula: BmrFormulaSchema,
  activityFactor: z.number().positive(),
  deficitKcal: z.number().int().nonnegative(),
  floorKcal: z.number().int().positive(),
  proteinGPerKg: z.number().positive(),
  fatGPerDay: z.number().int().positive(),
  carbUnit: CarbUnitSchema,
  priority: PlanPrioritySchema,
}

// la struttura del piano senza i parametri di calcolo: è ciò che un documento
// dice, ed è la forma che la bozza trascrive (D-050). I parametri restano solo
// in `PlanInputSchema` — vedi `plan-draft.ts`
export const planShape = {
  mealSlots: z.array(MealSlotInputSchema).min(1),
  dayTypes: z.array(DayTypeInputSchema).min(1),
  slotPrescriptions: z.array(SlotPrescriptionInputSchema),
  dayTypeRules: z.array(DayTypeRuleInputSchema),
}

export type PlanShape = {
  mealSlots: z.infer<typeof MealSlotInputSchema>[]
  dayTypes: z.infer<typeof DayTypeInputSchema>[]
  slotPrescriptions: z.infer<typeof SlotPrescriptionInputSchema>[]
  dayTypeRules: z.infer<typeof DayTypeRuleInputSchema>[]
}

// codici distinti, riferimenti che esistono, nessuna prescrizione doppia: vale
// per un piano e per una trascrizione, che hanno la stessa struttura
export const refinePlanShape = (plan: PlanShape, ctx: z.RefinementCtx): void => {
  const slotCodes = new Set(plan.mealSlots.map((s) => s.code))
  const dayTypeCodes = new Set(plan.dayTypes.map((d) => d.code))
  if (slotCodes.size !== plan.mealSlots.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate meal slot codes' })
  }
  if (dayTypeCodes.size !== plan.dayTypes.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Duplicate day type codes' })
  }
  const seen = new Set<string>()
  for (const p of plan.slotPrescriptions) {
    if (!dayTypeCodes.has(p.dayTypeCode) || !slotCodes.has(p.mealSlotCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Prescription references unknown codes: ${p.dayTypeCode}/${p.mealSlotCode}`,
      })
    }
    const key = `${p.dayTypeCode}/${p.mealSlotCode}/${p.kind}`
    if (seen.has(key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate prescription: ${key}` })
    }
    seen.add(key)
  }
  for (const r of plan.dayTypeRules) {
    if (!dayTypeCodes.has(r.dayTypeCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rule references unknown day type: ${r.dayTypeCode}`,
      })
    }
  }
}

export const PlanInputSchema = z
  .object({ ...planParams, ...planShape })
  .superRefine(refinePlanShape)

export const MealSlotResponseSchema = MealSlotInputSchema.extend({ id: z.string().uuid() })
export const DayTypeResponseSchema = DayTypeInputSchema.extend({ id: z.string().uuid() })
export const SlotPrescriptionResponseSchema = z
  .object({ id: z.string().uuid(), ...prescriptionKey, ...prescriptionCore })
  .superRefine(refineFreeAmount)
export const DayTypeRuleResponseSchema = DayTypeRuleInputSchema.extend({ id: z.string().uuid() })

// R-08: cella marcata «non previsto» — l'assenza di prescrizioni da sola non
// distingue la scelta del nutrizionista dal lavoro che manca
export const UnprescribedCellSchema = z.object(prescriptionKey)

export const PlanSummaryResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.number().int(),
  isActive: z.boolean(),
  validFrom: z.string().date(),
  validTo: z.string().date().nullish(),
})

export const PlanResponseSchema = PlanSummaryResponseSchema.extend({
  bmrFormula: BmrFormulaSchema,
  activityFactor: z.number(),
  deficitKcal: z.number().int(),
  floorKcal: z.number().int(),
  proteinGPerKg: z.number(),
  fatGPerDay: z.number().int(),
  carbUnit: CarbUnitSchema,
  priority: PlanPrioritySchema,
  mealSlots: z.array(MealSlotResponseSchema),
  dayTypes: z.array(DayTypeResponseSchema),
  slotPrescriptions: z.array(SlotPrescriptionResponseSchema),
  unprescribedCells: z.array(UnprescribedCellSchema),
  dayTypeRules: z.array(DayTypeRuleResponseSchema),
})

export const DayTypeRulesPutSchema = z.array(DayTypeRuleInputSchema).max(50)

// U10: lo spostamento è da indice a indice, e lo scambio a coppie non lo esprime
// — due PATCH in sequenza sanno solo scambiare vicini, e se la seconda falliva
// restavano due slot sulla stessa posizione. Il corpo descrive l'ordine finale,
// come DayTypeRulesPutSchema.
export const MealSlotOrderPutSchema = z
  .array(z.object({ id: z.string().uuid(), position: z.number().int().nonnegative() }))
  .min(1)
  .max(50)
  // le position sono l'ordine, quindi devono essere distinte: due righe sullo
  // stesso numero sono lo stato che questa rotta esiste per rendere impossibile
  .refine((rows) => new Set(rows.map((r) => r.position)).size === rows.length, {
    message: 'positions must be distinct',
  })
  .refine((rows) => new Set(rows.map((r) => r.id)).size === rows.length, {
    message: 'ids must be distinct',
  })

// manual override of the derived day type for a single date
export const DayTypeOverridePutSchema = z.object({ code: z.string().min(1).max(100) })
export const DayTypeOverrideResponseSchema = z.object({
  date: z.string().date(),
  code: z.string(),
})

// R-27/U2: la **fase** è la versione di piano — «a phase change creates a new
// version» sta scritto nel modello dal primo giorno, e il dato era già
// derivabile: nome, validità, settimana in corso. Quello che mancava era
// esporlo e far avvenire la transizione.
export const PhaseStateResponseSchema = z.object({
  planId: z.string().uuid(),
  name: z.string(),
  version: z.number().int(),
  validFrom: z.string().date(),
  // null = fase aperta, senza una fine dichiarata
  validTo: z.string().date().nullable(),
  // settimana in corso, 1-based, e quante ne dura in tutto se la fine c'è
  week: z.number().int().positive(),
  weeks: z.number().int().positive().nullable(),
})

// ⚠️ Il passaggio di fase **non cambia i parametri**: chiude la versione in
// corso e ne apre una identica col nome nuovo. Cambiare fase e cambiare deficit
// sono due decisioni, e infilarle nella stessa azione vorrebbe dire un form di
// piano dentro la transizione più un modo nuovo di fallire a metà.
// ⚠️ I giorni già registrati restano appesi alla versione vecchia
// (`meal_log.plan_id`): è precisamente per questo che la fase è una versione.
export const PhaseChangeInputSchema = z
  .object({
    name: z.string().min(1).max(200),
    // da quando vale la fase nuova; assente = oggi, deciso dal server
    validFrom: z.string().date().nullish(),
  })
  .strict()

export type PhaseStateResponse = z.infer<typeof PhaseStateResponseSchema>
export type PhaseChangeInput = z.infer<typeof PhaseChangeInputSchema>
export type MealSlotInput = z.infer<typeof MealSlotInputSchema>
export type MealSlotPatch = z.infer<typeof MealSlotPatchSchema>
export type MealSlotOrderPut = z.infer<typeof MealSlotOrderPutSchema>
export type DayTypeInput = z.infer<typeof DayTypeInputSchema>
export type DayTypePatch = z.infer<typeof DayTypePatchSchema>
export type SlotPrescriptionKind = z.infer<typeof SlotPrescriptionKindSchema>
export type SlotPrescriptionUnit = z.infer<typeof SlotPrescriptionUnitSchema>
export type SlotPrescription = z.infer<typeof SlotPrescriptionSchema>
export type SlotPrescriptionInput = z.infer<typeof SlotPrescriptionInputSchema>
export type SlotPrescriptionsPut = z.infer<typeof SlotPrescriptionsPutSchema>
export type SlotPrescriptionResponse = z.infer<typeof SlotPrescriptionResponseSchema>
export type UnprescribedCell = z.infer<typeof UnprescribedCellSchema>
export type DayTypeRuleInput = z.infer<typeof DayTypeRuleInputSchema>
export type PlanInput = z.infer<typeof PlanInputSchema>
export type DayTypeOverrideResponse = z.infer<typeof DayTypeOverrideResponseSchema>
export type PlanSummaryResponse = z.infer<typeof PlanSummaryResponseSchema>
export type PlanResponse = z.infer<typeof PlanResponseSchema>
