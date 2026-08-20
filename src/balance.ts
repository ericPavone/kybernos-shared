import { z } from 'zod'
import { EstimationSchema } from './meal-log'
import { BmrFormulaSchema, SlotPrescriptionSchema } from './plan'

// balances never expose a bare number: every total carries its interval
export const UncertainValueSchema = z.object({
  value: z.number(),
  min: z.number(),
  max: z.number(),
})

export const GuardrailObservationSchema = z.object({
  guardrailCode: z.string(),
  zone: z.enum(['soft', 'hard']),
  direction: z.enum(['below', 'above']),
  // false when the interval crosses the threshold (RF-69b)
  certain: z.boolean(),
  message: z.string().nullish(),
})

export const MacroBalanceSchema = z.object({
  consumed: UncertainValueSchema,
  targetG: z.number().nullish(),
  residualG: z.number().nullish(),
})

export const SlotStatusSchema = z.object({
  mealSlotId: z.string().uuid(),
  code: z.string(),
  label: z.string(),
  // D-013/U3: l'inizio dichiarato dello slot (HH:MM), `null` se non dichiarato.
  // La fine non è un campo: è l'inizio del successivo — vedi `slotStartsAt`
  startsAt: z.string().nullable(),
  // what the plan prescribes here for the day type in force — a quotation
  prescriptions: z.array(SlotPrescriptionSchema),
  // R-08: true = il piano non prevede questo pasto in questa giornata (scelta
  // dichiarata); prescriptions vuote senza flag = cella da compilare
  unprescribed: z.boolean(),
  logged: z.boolean(),
  // D-031: dichiarato dall'utente, per questo giorno e questo slot. «Saltato» e
  // «dimenticato» non sono lo stesso fatto: se hai saltato di proposito il
  // deficit della giornata è vero, se hai dimenticato di registrare è un
  // artefatto. ⚠️ Non si deduce mai — né dall'ora né dal vuoto a fine giornata:
  // uno slot vuoto e mai saltato resta *non registrato*, che è un terzo fatto
  skipped: z.boolean(),
  // R-33: voci in coda `unresolved_food` per questo slot — «registrato ma
  // incompleto» = logged && unresolvedCount > 0; il binario da solo mentiva
  unresolvedCount: z.number().int(),
})

// D-031: dichiarare o revocare «saltato» su (giorno, slot). Un solo verbo con
// il booleano invece di due rotte: è idempotente per costruzione, e «l'ho
// saltato» detto due volte è la stessa affermazione, non un errore.
export const SlotSkipInputSchema = z
  .object({
    // la regex contava le cifre, non i giorni: accettava 2026-02-31 e 2026-13-45
    date: z.string().date(),
    mealSlotId: z.string().uuid(),
    skipped: z.boolean(),
  })
  .strict()

export type SlotSkipInput = z.infer<typeof SlotSkipInputSchema>

// D-019: uno stato incompleto è una risposta valida — il motivo dichiarato con
// cui il giorno risponde 200 senza target. Un valore solo, il primo mancante
// nell'ordine di verifica: profilo → peso → piano → massa magra
export const BalanceReasonSchema = z.enum([
  'profile_missing',
  'weight_missing',
  'ffm_missing',
  'no_plan_for_date',
])

// D-034: precedenza misurata > dichiarata > attesa. Mai una media: una media
// produce un numero che nessuna fonte ha prodotto (D-002)
export const ActiveKcalSourceSchema = z.enum(['expected', 'declared', 'measured'])

// R-01 + R-07: la derivazione del target, quattro termini come sul motore —
// basal → tdee(basal, activityFactor, activeKcal) → target − deficit. Il peso
// (e la massa magra con Cunningham) è la misura IN VIGORE alla data del
// calcolo, con data e id per poterla raggiungere: non è «l'ultimo valore noto»,
// e la differenza è il punto della primitiva (D-009: senza blocchi di
// plausibilità, la derivazione è l'unico modo di vedere un input assurdo)
export const DerivationSchema = z.object({
  basal: z.number(),
  bmrFormula: BmrFormulaSchema,
  weightKgUsed: z.number(),
  weightMeasuredAt: z.string().date(),
  weightMeasurementId: z.string().uuid(),
  // solo con Cunningham, altrimenti null
  ffmKgUsed: z.number().nullable(),
  ffmMeasuredAt: z.string().date().nullable(),
  ffmMeasurementId: z.string().uuid().nullable(),
  activityFactor: z.number(),
  activeKcal: z.number(),
  // D-034: quale delle tre sorgenti è in vigore. Il numero cambia di
  // **significato**, non solo di valore — «400 attese dall'allenamento» non è
  // la stessa affermazione di «520 dichiarate» — e D-009 vuole che si veda
  activeKcalSource: ActiveKcalSourceSchema,
  // R-48: la previsione del tipo di giornata **prima** che il calcolo la
  // collassi a 0. `null` = la giornata non promette nessun lavoro, e senza
  // questo campo «previsto a zero» e «nessuna previsione» sono indistinguibili
  // dal client. ⛔ Non è una quarta sorgente: la distinzione è un campo
  expectedActiveKcal: z.number().int().nonnegative().nullable(),
  // R-49: quanti allenamenti sono registrati nel giorno, **indipendentemente**
  // da `activeKcal` — un'ora di pesi senza kcal conta qui e non altrove, ed è
  // l'unico modo di non dire «nessun allenamento registrato» a chi ne ha uno
  workoutCount: z.number().int().nonnegative(),
  deficitKcal: z.number().int(),
})

export const DailyBalanceResponseSchema = z.object({
  date: z.string().date(),
  // null quando nessuna versione di piano copre la data (D-019)
  planId: z.string().uuid().nullable(),
  dayTypeCode: z.string().nullish(),
  kcal: z.object({
    consumed: UncertainValueSchema,
    // null con `reason`: il consumato resta vero, il target non si inventa
    target: z.number().nullable(),
    residual: z.number().nullable(),
  }),
  floorKcal: z.number().int().nullable(),
  reason: BalanceReasonSchema.nullish(),
  // null quando `reason` è valorizzato: senza tutti i termini non si mostra
  // una derivazione a metà
  derivation: DerivationSchema.nullable(),
  // macro grams: day totals never use food weight (§4.1)
  macros: z.object({
    protein: MacroBalanceSchema,
    carbs: MacroBalanceSchema,
    fat: MacroBalanceSchema,
    fiber: MacroBalanceSchema,
  }),
  estimatedCount: z.number().int(),
  // R-33 (D-018+D-022): voci del giorno ancora in coda di chiarimento — il
  // totale è parziale e sbaglia per difetto: il residuo vero è più basso
  unresolvedCount: z.number().int(),
  slots: z.array(SlotStatusSchema),
  observations: z.array(GuardrailObservationSchema),
})

export const WeightTrendSchema = z.object({
  firstKg: z.number(),
  lastKg: z.number(),
  deltaKg: z.number(),
})

// one entry per day of the window; kcal null = unlogged day (missing data, not zero)
export const WeeklyDaySchema = z.object({
  date: z.string().date(),
  kcal: UncertainValueSchema.nullish(),
  // R-03: lo zero della scala è il target di quel giorno — con le giornate
  // tipo non è una costante della settimana; null = nessun piano sulla data
  targetKcal: z.number().int().nullable(),
  dayTypeCode: z.string().nullable(),
  estimatedCount: z.number().int(),
  // R-33: un giorno con voci sospese non è un giorno basso
  unresolvedCount: z.number().int(),
})

export const WeeklyBalanceResponseSchema = z.object({
  endDate: z.string().date(),
  days: z.array(WeeklyDaySchema),
  // il consumato resta vero anche a settimana incompleta (D-019)
  avgKcal: UncertainValueSchema,
  // null quando nessun giorno registrato ha un target: non si inventa
  deltaVsTarget: UncertainValueSchema.nullable(),
  avgProteinG: UncertainValueSchema,
  daysLogged: z.number().int(),
  estimatedCount: z.number().int(),
  // D-019 sul weekly — globale solo quando la misura non esiste affatto; la
  // misura che c'è ma non copre un giorno toglie il target a quel giorno solo
  reason: BalanceReasonSchema.nullish(),
  weightTrend: WeightTrendSchema.nullish(),
  observations: z.array(GuardrailObservationSchema),
})

export const DailyMealItemSchema = z.object({
  mealSlotLabel: z.string(),
  // W0.1: l'ora della voce. Senza, il contesto del turno sa che lo slot è
  // pieno e non sa che cosa c'è dentro né da quando — e una correzione
  // dell'utente diventava una registrazione nuova
  eatenAt: z.string().datetime({ offset: true }),
  foodName: z.string(),
  gramsFood: z.number(),
  kcal: z.number(),
  proteinG: z.number(),
  carbsG: z.number(),
  fatG: z.number(),
  estimation: EstimationSchema,
})

export const DailyMealsResponseSchema = z.object({
  date: z.string().date(),
  meals: z.array(DailyMealItemSchema),
})

export const DailyBalanceQuerySchema = z.object({ date: z.string().date() })
export const WeeklyBalanceQuerySchema = z.object({ endDate: z.string().date() })

export type BalanceReason = z.infer<typeof BalanceReasonSchema>
export type ActiveKcalSource = z.infer<typeof ActiveKcalSourceSchema>
export type Derivation = z.infer<typeof DerivationSchema>
export type UncertainValue = z.infer<typeof UncertainValueSchema>
export type GuardrailObservation = z.infer<typeof GuardrailObservationSchema>
export type MacroBalance = z.infer<typeof MacroBalanceSchema>
export type SlotStatus = z.infer<typeof SlotStatusSchema>
export type WeeklyDay = z.infer<typeof WeeklyDaySchema>
export type DailyMealItem = z.infer<typeof DailyMealItemSchema>
export type DailyMealsResponse = z.infer<typeof DailyMealsResponseSchema>
export type DailyBalanceResponse = z.infer<typeof DailyBalanceResponseSchema>
export type WeeklyBalanceResponse = z.infer<typeof WeeklyBalanceResponseSchema>

// R-39/D-023 — **una sola fonte di verità su una regola di sicurezza.** Viveva
// nel backend (`domain/service/plan/proposal-guard.ts`) e il client la
// riscriveva a mano in `chat.ts`: chi cambiava la soglia doveva cambiarla in due
// posti, e uno dei due sarebbe stato dimenticato. Il debito era appeso alla
// prima fetta che apre BE e shared insieme, ed è U2.
//
// ⚠️ Solo `above`, e non è un dettaglio. Le osservazioni si calcolano sui **totali
// del giorno**: un `hard_min` sulle kcal (il floor) produce `hard`+`below`+`certain`
// a metà mattina, perché la giornata non è finita. Quella non è una violazione
// causata dalla proposta, è una proprietà del giorno — e trattarla come tale
// impediva di proporre la registrazione di un pasto fino a floor superato.
// Aggiungere cibo può portare sopra un massimo, mai sotto un minimo.
export const hardOverage = (
  observations: readonly GuardrailObservation[],
): GuardrailObservation | null =>
  observations.find((o) => o.zone === 'hard' && o.certain && o.direction === 'above') ?? null
