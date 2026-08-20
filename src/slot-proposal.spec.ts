import { describe, expect, it } from 'vitest'
import { isSettledSlot, proposedSlotIndex, type SettledFacts } from './slot-proposal'

const aperto: SettledFacts = { logged: false, skipped: false, unprescribed: false }

describe('isSettledSlot', () => {
  it('uno slot vuoto, non saltato e prescritto non è sistemato', () => {
    expect(isSettledSlot(aperto)).toBe(false)
  })

  // ⛔ È il caso su cui le due sedi divergevano: il frontend contava
  // `unprescribed` fra i sistemati, il system prompt del modello no
  it.each([
    ['registrato', { ...aperto, logged: true }],
    ['saltato', { ...aperto, skipped: true }],
    ['non prescritto', { ...aperto, unprescribed: true }],
  ])('%s è sistemato', (_, slot) => {
    expect(isSettledSlot(slot)).toBe(true)
  })
})

describe('proposedSlotIndex', () => {
  it('senza slot non c’è una proposta', () => {
    expect(proposedSlotIndex([])).toBeNull()
  })

  it('propone il primo non sistemato', () => {
    const slots = [{ ...aperto, logged: true }, aperto, aperto]
    expect(proposedSlotIndex(slots)).toBe(1)
  })

  // se `unprescribed` non contasse, la proposta si fermerebbe sullo slot 1 e non
  // ci sarebbe modo di sbloccarla: su un non prescritto non si offre «Salta»
  it('scavalca uno slot che il piano non prescrive', () => {
    const slots = [{ ...aperto, logged: true }, { ...aperto, unprescribed: true }, aperto]
    expect(proposedSlotIndex(slots)).toBe(2)
  })

  it('a giornata sistemata propone l’ultimo non saltato', () => {
    const slots = [
      { ...aperto, logged: true },
      { ...aperto, logged: true },
      { ...aperto, skipped: true },
    ]
    expect(proposedSlotIndex(slots)).toBe(1)
  })

  // qualunque scelta contraddice qualcosa: resta l'ultimo, e a renderlo onesto
  // è la riga d'esito che lo nomina
  it('se sono saltati tutti resta l’ultimo', () => {
    const slots = [{ ...aperto, skipped: true }, { ...aperto, skipped: true }]
    expect(proposedSlotIndex(slots)).toBe(1)
  })
})
