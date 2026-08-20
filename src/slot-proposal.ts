// D-035: lo slot che l'app propone — la card «Adesso» e lo slot in cui si
// scrive — è il primo non sistemato; a giornata sistemata è l'ultimo non
// saltato.
//
// ⛔ STA QUI, E LA RAGIONE È UN DIFETTO VERO. La regola è vissuta per un giorno
// in due implementazioni: `lib/api/balance.ts` nel frontend e una riscrittura in
// inglese dentro il system prompt del modello. Divergevano già — il frontend
// contava `unprescribed` fra i sistemati, il prompt no — quindi su uno slot che
// il piano non prescrive app e modello proponevano slot diversi, e nessuno dei
// due sbagliava rispetto a ciò che gli era stato detto. Una regola scritta due
// volte diverge in silenzio: qui è scritta una volta, e la leggono entrambi.
//
// La forma è strutturale e non `SlotStatus` perché i due chiamanti arrivano con
// forme diverse dello stesso fatto — il frontend con `entries.length` e uno
// `status`, il server col DTO — e sono i **fatti** a essere condivisi, non il
// contenitore.
export interface SettledFacts {
  logged: boolean
  // D-031: dichiarato dall'utente, mai dedotto dall'ora né dal vuoto
  skipped: boolean
  // R-08: il piano non prevede questo pasto qui. È sistemato anche da vuoto, ed
  // è forzato e non scelto: l'elenco non offre «Salta» su uno slot non
  // prescritto, quindi lasciarlo non-sistemato bloccherebbe la proposta per
  // sempre senza un modo di sbloccarla.
  unprescribed: boolean
}

export const isSettledSlot = (s: SettledFacts): boolean => s.logged || s.skipped || s.unprescribed

/**
 * L'indice dello slot proposto, o `null` se non ci sono slot.
 *
 * A giornata sistemata la proposta è l'**ultimo non saltato**: fra le regole
 * possibili è l'unica che non può mai contraddire un atto dell'utente. Se sono
 * saltati tutti, qualunque scelta contraddice qualcosa — resta l'ultimo, e a
 * renderlo onesto è la riga d'esito che lo nomina, non la regola.
 */
export function proposedSlotIndex(slots: readonly SettledFacts[]): number | null {
  if (slots.length === 0) return null
  const aperto = slots.findIndex((s) => !isSettledSlot(s))
  if (aperto !== -1) return aperto
  const nonSaltato = slots.findLastIndex((s) => !s.skipped)
  return nonSaltato !== -1 ? nonSaltato : slots.length - 1
}
