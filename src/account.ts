import { z } from 'zod'

// Quanto c'è dei tuoi dati. ⛔ Sono conteggi delle righe **vive**: una voce
// corretta o ritrattata non si cancella (D6, `superseded_by`/`voided_at`), ma
// contarla direbbe all'utente di avere più di quello che vede.
export const DataSummarySchema = z.object({
  meals: z.number().int().nonnegative(),
  measurements: z.number().int().nonnegative(),
  sets: z.number().int().nonnegative(),
  planVersions: z.number().int().nonnegative(),
  // il giorno della prima riga, o `null` se non ce n'è nessuna: è ciò che regge
  // «26 settimane», e senza dati **non si stampa un0**
  firstRecordOn: z.string().date().nullable(),
})

export type DataSummary = z.infer<typeof DataSummarySchema>
