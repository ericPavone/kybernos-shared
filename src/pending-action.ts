import { z } from 'zod'
import { ComputeMealResponseSchema } from './compute-meal'
import { MAX_AMBIGUOUS_CANDIDATES } from './food-resolution'
import { UserFoodInputSchema } from './food'
import { EstimationSchema, MealLogInputSchema } from './meal-log'
import { PlanInputSchema } from './plan'
import { RuleInputSchema } from './rule'

export const PendingActionKindSchema = z.enum([
  'rule',
  'preference',
  'constraint',
  'meal',
  'food',
  'plan_change',
  'unresolved_food',
])

// D-024: i candidati di una voce ambigua, come li rende il client — nome e
// dettaglio per distinguerli, `foodId` per risolverla. È un'istantanea del
// momento in cui la voce è nata: l'alimento può non esistere più alla scelta.
export const FoodCandidateSchema = z.object({
  foodId: z.string().uuid(),
  name: z.string().min(1).max(200),
  detail: z.string().max(200),
  // la dispensa personale sempre prima (RF-21): l'ordine è quello dell'array
  personal: z.boolean(),
})

// R-44: il numero dentro il nome («farina d'avena 50 g») contro il campo
// `grams` (500) — due letture della stessa quantità prodotte dallo stesso
// turno. Nessuno può sapere quale valga, e la differenza è un fattore 10: la
// voce non si scrive, si chiede, e la domanda ha bisogno di entrambe.
export const GramsReadingsSchema = z.object({
  fromName: z.number().positive(),
  fromField: z.number().positive(),
})

// D-022: voce di pasto non risolta dal batch — porta grammi, slot e orario
// originali, così la risoluzione registra retroattivamente sul momento vero.
// D-024: se l'irrisolto è un'ambiguità, porta anche i candidati.
export const UnresolvedFoodPayloadSchema = z.object({
  food: z.string().min(1).max(200),
  gramsFood: z.number().positive().nullish(),
  mealSlotId: z.string().uuid(),
  slotLabel: z.string().min(1).max(100),
  eatenAt: z.string().datetime({ offset: true }),
  localTz: z.string().min(1).max(64),
  estimation: EstimationSchema.nullish(),
  candidates: z.array(FoodCandidateSchema).max(MAX_AMBIGUOUS_CANDIDATES).nullish(),
  // D-028: la frase è dell'utente o del modello? Si sa solo qui, col testo del
  // turno sotto mano, e serve dopo — alla scelta, per decidere se aliasarla in
  // dispensa. Opzionale: le voci accodate prima restano valide
  saidByUser: z.boolean().nullish(),
  // R-44: presenti = `gramsFood` è null perché le due letture divergono, e la
  // scelta è dell'utente. Opzionale: le voci accodate prima restano valide
  gramsReadings: GramsReadingsSchema.nullish(),
  // D-045: il volume dichiarato dall'utente. Presente = `gramsFood` è null
  // perché l'alimento non porta una densità, e la domanda è «quanti grammi
  // sono?». L'unità dichiarata si conserva: non si riscrive in grammi qui.
  // Opzionale: le voci accodate prima restano valide
  declaredMl: z.number().positive().nullish(),
  // D-032: la riga che risponde a «non so quale, uno vale l'altro» — prima
  // della classe di equivalenza più numerosa, personale prima (RF-21). Si
  // calcola qui perché i numeri stanno qui: i candidati non li portano, e
  // metterceli darebbe al client una seconda fonte di verità sulla regola.
  // Opzionale: le voci accodate prima restano valide, e per loro la risposta
  // non si offre
  representativeFoodId: z.string().uuid().nullish(),
})

// AB9/D-022: le voci irrisolte del **percorso deterministico** — il campo
// digitato di Oggi e di SlotDettaglio. Prima esistevano solo sul percorso
// dell'assistente: `commit` mappava le sole `resolved`, e ciò che «restava
// fuori» non veniva mandato da nessuna parte. Il server non ne sentiva mai
// parlare, quindi non poteva neanche tenerne traccia.
//
// ⛔ `saidByUser` è omesso di proposito, e non per brevità: su questa strada è
// vero **per costruzione** — il nome l'ha scritto l'utente, non un modello — e
// lo dichiara il server. È la stessa ragione per cui il marcatore di certezza
// non lo mette il chiamante: un client distratto non deve poterlo smentire.
//
// ⛔ AB9-ter: e `slotLabel` nemmeno, per la stessa ragione applicata a un campo
// che il server sa **calcolare**. È ciò che l'utente leggerà in coda per
// trenta giorni: riceverlo dal client significava accettare un'etichetta
// stantia — o di uno slot che non è suo — e scoprirlo solo alla risoluzione.
// Il server verifica `mealSlotId` e deriva il nome, come fa il percorso dei
// tool. Validare l'etichetta non sarebbe bastato: il rimedio è non riceverla.
//
// ⛔ E `expiresAt` non è d'ingresso: lo calcola il server da `eatenAt`, con la
// formula delle voci da chiarire (TTL), non con quella delle proposte.
export const ManualUnresolvedFoodInputSchema = z.object({
  // stesso tetto del batch dei pasti: le voci arrivano dallo stesso invio
  entries: z
    .array(UnresolvedFoodPayloadSchema.omit({ saidByUser: true, slotLabel: true }))
    .min(1)
    .max(30),
})

// H3.5: il payload di una pending_action deve superare questi schemi prima di
// diventare una scrittura — un payload malformato si rifiuta, mai si scrive.
// preference/constraint: forma provvisoria fino a RF-43
export const PendingActionPayloadSchemas = {
  rule: RuleInputSchema,
  preference: z.object({ text: z.string().min(1).max(1000) }),
  constraint: z.object({ text: z.string().min(1).max(1000) }),
  // computed: fotografia di computeMeal al momento della proposta (RF-41);
  // il decision service la ignora, il log usa solo i campi MealLogInput
  meal: MealLogInputSchema.extend({ computed: ComputeMealResponseSchema.nullish() }),
  food: UserFoodInputSchema,
  plan_change: PlanInputSchema,
  unresolved_food: UnresolvedFoodPayloadSchema,
} as const satisfies Record<z.infer<typeof PendingActionKindSchema>, z.ZodTypeAny>

// D-022/R-31: la risoluzione indica l'alimento; gli altri campi, se assenti,
// restano quelli del payload originale. `localTz` non è sovrascrivibile.
// ⚠️ `foodId` non è vincolato ai `candidates` del payload: D-022 lascia aperto
// anche «cerca in dispensa» e «crea», i candidati sono una scorciatoia.
//
// D-032: `anyOfThem` è l'**intento** — «non so quale, uno vale l'altro» —, e
// non è ridondante col `representativeFoodId` del payload, che è il **dato**.
// Senza, il server riceverebbe un `foodId` e non potrebbe distinguere «ho
// scelto X» da «non lo so, X l'avete scelto voi»: due fatti diversi, con
// conseguenze diverse sulla correzione e sulla voce dell'assistente, persi al
// confine del contratto. È anche il motivo per cui il marcatore di certezza lo
// mette il server e non il chiamante: un client distratto registrerebbe come
// `weighed` una voce che nessuno ha scelto.
export const UnresolvedFoodResolutionSchema = z
  .object({
    foodId: z.string().uuid().optional(),
    anyOfThem: z.literal(true).optional(),
    gramsFood: z.number().positive().optional(),
    mealSlotId: z.string().uuid().optional(),
    eatenAt: z.string().datetime({ offset: true }).optional(),
    estimation: EstimationSchema.optional(),
  })
  .superRefine((val, ctx) => {
    // o si nomina l'alimento o si dichiara di non saperlo: insieme sarebbero
    // due risposte alla stessa domanda, e il server dovrebbe sceglierne una
    if ((val.foodId != null) === (val.anyOfThem === true)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['foodId'],
        message: 'indica l\'alimento oppure `anyOfThem`, non entrambi',
      })
    }
  })

export const PendingActionStatusSchema = z.enum(['pending', 'accepted', 'rejected', 'expired'])

export const PendingActionResponseSchema = z.object({
  id: z.string().uuid(),
  kind: PendingActionKindSchema,
  payload: z.unknown(),
  status: PendingActionStatusSchema,
  expiresAt: z.string().datetime({ offset: true }),
  decidedAt: z.string().datetime({ offset: true }).nullish(),
  createdAt: z.string().datetime({ offset: true }),
})

// D-024 punto 2: alla scelta si offre «lo tieni in dispensa?». Additivo sulla
// risposta della risoluzione — l'offerta è una pending_action `food` come le
// altre, si accetta e si rifiuta dalle rotte che esistono già
export const ResolvedUnresolvedFoodSchema = PendingActionResponseSchema.extend({
  offer: PendingActionResponseSchema.nullish(),
})

export type PendingActionKind = z.infer<typeof PendingActionKindSchema>
export type FoodCandidate = z.infer<typeof FoodCandidateSchema>
export type GramsReadings = z.infer<typeof GramsReadingsSchema>
export type UnresolvedFoodPayload = z.infer<typeof UnresolvedFoodPayloadSchema>
export type UnresolvedFoodResolution = z.infer<typeof UnresolvedFoodResolutionSchema>
export type PendingActionStatus = z.infer<typeof PendingActionStatusSchema>
export type PendingActionResponse = z.infer<typeof PendingActionResponseSchema>
export type ResolvedUnresolvedFood = z.infer<typeof ResolvedUnresolvedFoodSchema>
export type ManualUnresolvedFoodInput = z.infer<typeof ManualUnresolvedFoodInputSchema>
