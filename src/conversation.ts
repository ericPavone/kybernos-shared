import { z } from 'zod'

// La conversazione riletta dal server. ⛔ Serve perché le foto si conservano
// (`image.ts`) ma il thread del client vive in memoria: senza questa rotta, dopo
// un riavvio le foto esistono sul server e nessuna schermata può mostrarle.
//
// ⛔ **Cosa NON c'è, ed è la parte importante**: niente `proposals`, niente
// `unresolvedIds`. Non è una dimenticanza — quelle vivono in `pending_action`,
// non nel messaggio, e il loro stato di oggi non è quello di quando il messaggio
// fu scritto. Un messaggio riletto **non rende bottoni**, e la differenza sta
// nella FORMA del dato invece che in un ramo del rendering: un ramo dentro il
// componente sparirebbe il giorno che qualcuno «uniforma» le due bolle.
export const ConversationMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  // l'id della foto, se la si è conservata. `null` anche per i messaggi di prima
  // dell'archivio, che una foto l'avevano ma i cui byte non esistono
  imageId: z.string().uuid().nullable(),
  // ⚠️ Vero anche dove `imageId` è `null`: dice «questo messaggio aveva una
  // foto», che è un'altra cosa da «la foto ce l'abbiamo ancora»
  hadImage: z.boolean(),
  at: z.string(),
})

export const ConversationResponseSchema = z.object({
  conversationId: z.string().uuid(),
  // in ordine cronologico, dal più vecchio: è l'ordine in cui si legge
  messages: z.array(ConversationMessageSchema),
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>
