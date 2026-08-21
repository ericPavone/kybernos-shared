import { z } from 'zod'
import { DateRangeSchema } from './date-range'

// Ciò che il telefono ha MISURATO in una giornata.
//
// ⛔ Non è una sorgente del bersaglio: D-034 dice che le kcal attive che muovono
// il target sono quelle **attese** del tipo di giornata, e una giornata andata
// diversamente si corregge cambiando il **tipo** (l'override di D-015). Questi
// numeri servono a far vedere lo scarto, non a chiuderlo da soli.
export const HealthDayInputSchema = z
  .object({
    date: z.string().date(),
    // ⚠️ Tutti opzionali e nullable, e non è pigrizia: HealthKit restituisce
    // ciò che ha, e un utente senza orologio non ha una frequenza a riposo.
    // Un campo obbligatorio costringerebbe il client a inventare uno zero, che
    // qui non vuol dire «nessun dato» ma «zero passi».
    steps: z.number().int().nonnegative().nullish(),
    // ATTIVE, mai totali: il basale lo calcola il piano, e sommarlo due volte
    // gonfierebbe la giornata di circa millecinquecento kcal
    activeKcal: z.number().int().nonnegative().nullish(),
    exerciseMinutes: z.number().int().nonnegative().nullish(),
    restingHeartRate: z.number().positive().max(250).nullish(),
  })
  .strict()

export const HealthDayResponseSchema = HealthDayInputSchema.extend({
  steps: z.number().int().nullable(),
  activeKcal: z.number().int().nullable(),
  exerciseMinutes: z.number().int().nullable(),
  restingHeartRate: z.number().nullable(),
  source: z.string(),
})

export const HealthDaysQuerySchema = DateRangeSchema

export type HealthDayInput = z.infer<typeof HealthDayInputSchema>
export type HealthDayResponse = z.infer<typeof HealthDayResponseSchema>
