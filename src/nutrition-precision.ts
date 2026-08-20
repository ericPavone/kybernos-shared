// D-033: la precisione è **una sola**, ed è la stessa ovunque il numero venga
// mostrato o detto — schermo, contesto del turno, voce dell'assistente,
// confronto fra candidati: kcal all'intero, macro a un decimale.
//
// La regola si sdoppia in due verso, e trattarli come uno solo è ciò che rende
// la decisione contraddittoria invece che applicabile:
//
//   `roundedPer100`  → **politica di precisione del sistema**. Vale appena il
//                      valore del catalogo entra in gioco, prima di qualunque
//                      scala, **anche sui percorsi aritmetici**.
//   `forPortion`     → aggiunge l'arrotondamento di **presentazione**, dopo la
//                      scala. Vale **solo al bordo**, sul campo che va a
//                      schermo o nella voce, nel momento in cui ci va.
//
// ⚠️ Si arrotonda il più tardi possibile, e mai dentro una funzione che
// qualcuno potrebbe riusare per fare aritmetica: sommare venti addendi
// arrotondati introduce un errore nel bilancio per riparare un artefatto del
// display. Somme, intervalli e margini restano a piena precisione.

export type Per100 = { kcal: number; p: number; c: number; f: number }

const int = (x: number): number => Math.round(x)
// esportata: è la stessa grana dei target e delle soglie del backend (D-033,
// «macro a un decimale»), dove era riscritta due volte
export const dec1 = (x: number): number => Math.round(x * 10) / 10

// ⚠️ Questa è una **politica**, non la correzione di un dato sbagliato.
// `19,44` potrebbe essere genuino: non abbiamo alcun modo di distinguere due
// decimali reali da un artefatto della fonte — la sorgente ha dato quello che
// ha dato. Si adotta la **precisione più bassa come precisione del sistema**
// perché la precisione comune è l'unica su cui tutte le righe siano
// confrontabili, ed è l'autoconsistenza ciò che D-033 chiede.
//
// Costo dichiarato: al massimo **mezzo decimo di grammo per 100 g**, sotto la
// soglia di qualunque decisione nutrizionale. Il giorno che arrivasse una fonte
// con due decimali veri, questa è la leva da alzare — e sapere che è una leva è
// il motivo per cui qui non c'è scritto «precisione vera».
export const roundedPer100 = (v: Per100): Per100 => ({
  kcal: int(v.kcal),
  p: dec1(v.p),
  c: dec1(v.c),
  f: dec1(v.f),
})

// le cifre che l'utente vede per quella porzione. Si arrotonda **prima** di
// scalare: il numero visto a 100 g è quello da cui deriva tutto il resto, ed è
// ciò che fa collassare a ogni porzione due righe che differivano solo per la
// precisione della fonte (19,44 e 19,4 → 19,4, poi ×2 → 38,8 per entrambe).
export const forPortion = (v: Per100, grams: number): Per100 => {
  const base = roundedPer100(v)
  const k = grams / 100
  return { kcal: int(base.kcal * k), p: dec1(base.p * k), c: dec1(base.c * k), f: dec1(base.f * k) }
}
