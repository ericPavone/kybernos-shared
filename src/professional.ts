import { z } from 'zod'

// Chi ti segue: una riga per utente (`professional.user_id` è unique), scritta
// **dall'utente**. ⛔ Non è un account e non è un destinatario: l'app non le
// manda niente da sola, e questa scheda esiste per avere i contatti a portata,
// non per aprire un canale.
// ⛔ Un campo facoltativo esce come `null`, mai come `undefined`, e la regola sta
// QUI perché è il confine: `undefined` dentro l'`onConflictDoUpdate` del DAO
// **lascia il valore vecchio**, quindi togliere la città non la toglierebbe. Se
// la conversione vivesse nel controller, un secondo percorso di scrittura — un
// tool dell'agente, un import — la salterebbe in silenzio.
const facoltativo = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().transform((v: z.infer<T> | null | undefined) => v ?? null)

export const ProfessionalInputSchema = z.object({
  name: z.string().min(1).max(200),
  // «biologa nutrizionista», «dietista»: la professione come la scrive l'utente,
  // non un enum — un elenco chiuso sbaglierebbe al primo titolo che non prevede
  credential: z.string().min(1).max(200),
  city: facoltativo(z.string().max(120)),
  email: facoltativo(z.string().email().max(320)),
  // ⛔ Nessuna validazione di formato: un numero di studio, un cellulare e un
  // interno si scrivono in dieci modi, e rifiutarne uno vero è peggio che
  // accettarne uno storto
  phone: facoltativo(z.string().max(40)),
  address: facoltativo(z.string().max(300)),
  socials: facoltativo(z.array(z.string().max(200)).max(10)),
  // da quando la segui: una data, non «dal 3 feb» — la forma è del client
  since: facoltativo(z.string().date()),
})

export const ProfessionalResponseSchema = ProfessionalInputSchema.extend({
  id: z.string().uuid(),
})

export type ProfessionalInput = z.infer<typeof ProfessionalInputSchema>
export type ProfessionalResponse = z.infer<typeof ProfessionalResponseSchema>
