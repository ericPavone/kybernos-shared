import { z } from 'zod'
import { planShape, refinePlanShape } from './plan'

// D-050: una bozza non è un piano. Non compare nei bilanci, non ha versione, e
// nessun `meal_log` può citarla — fino alla promozione **non esiste** per il
// resto del sistema. Lo stato è a senso unico: da `draft` si esce una volta.
export const PlanDraftStatusSchema = z.enum(['draft', 'promoted', 'discarded'])

// ⛔ La trascrizione porta ciò che il DOCUMENTO dice, non i parametri di calcolo
// del piano (`bmrFormula`, `deficitKcal`, …): quelli sono configurazione di
// Kybernos, un documento non li contiene, e farli trascrivere al modello
// vorrebbe dire otto numeri inventati (D-030). Li copia la promozione dal piano
// in forza.
export const PlanDraftTranscriptionSchema = z
  .object({
    name: z.string().min(1).max(200),
    // il documento può dichiarare da quando vale; assente = lo decide chi promuove
    validFrom: z.string().date().nullish(),
    ...planShape,
  })
  .superRefine(refinePlanShape)

// AD1a: l'ingresso è il testo incollato. Il file è AD1b, e quando arriverà
// produrrà lo stesso `sourceText` invece di una seconda catena
export const PlanDraftInputSchema = z
  .object({ sourceText: z.string().min(1).max(50_000) })
  .strict()

// la correzione sostituisce la trascrizione intera: sono decine di righe su più
// schermate e l'utente ci passa dei minuti (D-050 §b), quindi la scrittura
// descrive lo stato finale come `DayTypeRulesPutSchema`, non una riga per volta
export const PlanDraftPatchSchema = z
  .object({ transcription: PlanDraftTranscriptionSchema })
  .strict()

export const PlanDraftResponseSchema = z.object({
  id: z.string().uuid(),
  status: PlanDraftStatusSchema,
  // il testo grezzo com'è arrivato, mai troncato: è l'unico arbitro fra un
  // refuso e una decisione (D-050 invariante 4)
  sourceText: z.string(),
  transcription: PlanDraftTranscriptionSchema,
  // NULL finché è bozza; dopo la promozione punta alla versione che ha generato
  // (invariante 3), e la riga resta leggibile
  promotedPlanId: z.string().uuid().nullable(),
  updatedAt: z.string().datetime(),
})

export type PlanDraftStatus = z.infer<typeof PlanDraftStatusSchema>
export type PlanDraftTranscription = z.infer<typeof PlanDraftTranscriptionSchema>
export type PlanDraftInput = z.infer<typeof PlanDraftInputSchema>
export type PlanDraftPatch = z.infer<typeof PlanDraftPatchSchema>
export type PlanDraftResponse = z.infer<typeof PlanDraftResponseSchema>
