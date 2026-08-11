import { describe, expect, it } from 'vitest'
import {
  equivalenceClasses,
  representativeOf,
  resolveFoodByName,
  sameNutrition,
  type Per100,
} from './food-resolution'

const PER100: Per100 = { kcal: 100, p: 10, c: 10, f: 10 }

const food = (
  name: string,
  personal = false,
  aliases: { alias: string; gramsFood?: number }[] = [],
  per100: Per100 = PER100,
) => ({
  name,
  personal,
  aliases,
  per100,
})

describe('resolveFoodByName', () => {
  it('corrispondenza esatta unica → resolved', () => {
    const result = resolveFoodByName('mozzarella', [food('Mozzarella'), food('Mozzarella light')])

    expect(result).toEqual({ kind: 'resolved', food: food('Mozzarella') })
  })

  it('a parità di nome vince il personale, senza contare come ambiguità (RF-21)', () => {
    const canonical = food('Mozzarella')
    const personal = food('Mozzarella', true)

    const result = resolveFoodByName('mozzarella', [personal, canonical])

    expect(result).toEqual({ kind: 'resolved', food: personal })
  })

  it('alias esatto prima del nome, coi grammi impliciti', () => {
    const mozzarella = food('Mozzarella', true, [{ alias: 'mezza mozzarella', gramsFood: 60 }])

    const result = resolveFoodByName('mezza mozzarella', [mozzarella, food('Mozzarella light')])

    expect(result).toEqual({ kind: 'resolved', food: mozzarella, aliasGrams: 60 })
  })

  it('omonimi con gli stessi numeri → il primo, senza domanda', () => {
    const coop = { ...food('Tonno al Naturale'), brand: 'Coop' }
    const crai = { ...food('Tonno al Naturale'), brand: 'Crai' }

    const result = resolveFoodByName('tonno al naturale', [coop, crai])

    expect(result).toEqual({ kind: 'resolved', food: coop })
  })

  it('omonimi che differiscono nei numeri → ambiguous (D-024b)', () => {
    const light = food('Tonno al Naturale', false, [], { kcal: 92, p: 19.4, c: 0, f: 1 })
    const olio = food('Tonno al Naturale', false, [], { kcal: 190, p: 22, c: 0, f: 11 })

    const result = resolveFoodByName('tonno al naturale', [light, olio])

    expect(result).toEqual({ kind: 'ambiguous', candidates: [light, olio], representative: light })
  })

  // senza questa, «lo tieni in dispensa?» non toglierebbe l'attrito: i quattro
  // «Pane» del catalogo differiscono nei numeri e la domanda tornerebbe sempre
  it('fra omonimi difformi il personale vince e chiude la domanda (RF-21)', () => {
    const mio = food('Pane', true, [], { kcal: 261, p: 8.1, c: 46, f: 4.1 })
    const altro = food('Pane', false, [], { kcal: 280, p: 9.4, c: 47, f: 4.9 })

    const result = resolveFoodByName('pane', [mio, altro])

    expect(result).toEqual({ kind: 'resolved', food: mio })
  })

  it('nomi diversi ma stessi numeri → si tace e si prende il primo (D-024b)', () => {
    const conad = food('Merluzzo Carbonaro Conad')
    const esselunga = food('Merluzzo Carbonaro Esselunga')

    const result = resolveFoodByName('merluzzo carbonaro', [conad, esselunga])

    expect(result).toEqual({ kind: 'resolved', food: conad })
  })

  it('candidato unico non esatto → resolved quando viene dalla query intera', () => {
    const result = resolveFoodByName('mozzar', [food('Mozzarella di bufala')])

    expect(result).toEqual({ kind: 'resolved', food: food('Mozzarella di bufala') })
  })

  it('candidato unico non esatto dal fallback per token → si chiede, non si scrive (D-028)', () => {
    const bar = food('Protein Bar Peanut Caramel')

    const result = resolveFoodByName('peanut butter', [bar], { trustSingleCandidate: false })

    expect(result).toEqual({ kind: 'ambiguous', candidates: [bar], representative: bar })
  })

  it('dal fallback per token il nome esatto resta una certezza', () => {
    const banana = food('Banana')

    const result = resolveFoodByName('banana', [banana, food('Banana essiccata')], {
      trustSingleCandidate: false,
    })

    expect(result).toEqual({ kind: 'resolved', food: banana })
  })

  it('dal fallback per token nemmeno l\'equivalenza basta: la provenienza è un veto', () => {
    const uno = food('Coffee Shake')
    const due = food('Coffee Shake Light')

    const result = resolveFoodByName('shake proteico', [uno, due], { trustSingleCandidate: false })

    // stessi numeri, quindi un profilo solo: la lista collassa e la domanda non
    // c'è più — ma il veto della provenienza resta, e la voce non si scrive
    expect(result).toEqual({ kind: 'ambiguous', candidates: [uno], representative: uno })
  })

  it('più corrispondenze → ambiguous con al massimo 4 profili', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      food(`Mozzarella ${i}`, false, [], { ...PER100, kcal: 100 + i }),
    )

    const result = resolveFoodByName('mozzarella', candidates)

    expect(result.kind).toBe('ambiguous')
    if (result.kind === 'ambiguous') {
      expect(result.candidates).toEqual(candidates.slice(0, 4))
    }
  })

  // D-032: il tetto conta i profili, non le righe — otto righe da tre profili
  // sono tre domande possibili, non otto
  it('le righe equivalenti collassano dentro la lista, e il tetto vale sui profili', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      food(`Yogurt ${i}`, false, [], { ...PER100, kcal: 100 + (i % 3) }),
    )

    const result = resolveFoodByName('yogurt', candidates)

    expect(result.kind).toBe('ambiguous')
    if (result.kind === 'ambiguous') {
      expect(result.candidates).toEqual([candidates[0], candidates[1], candidates[2]])
    }
  })

  it('«uno vale l\'altro» è la prima riga della classe più numerosa', () => {
    const deco = food('Yogurt Decò', false, [], { kcal: 56, p: 9, c: 5, f: 0 })
    const despar = food('Yogurt Despar', false, [], { kcal: 55, p: 9, c: 5, f: 0 })
    const crai = food('Yogurt Crai', false, [], { kcal: 56, p: 9, c: 5, f: 0 })

    const result = resolveFoodByName('yogurt', [despar, deco, crai], { grams: 200 })

    expect(result.kind).toBe('ambiguous')
    if (result.kind === 'ambiguous') {
      // Decò e Crai sono la stessa classe: due contro uno, e la prima è Decò
      expect(result.candidates).toEqual([despar, deco])
      expect(result.representative).toBe(deco)
    }
  })

  it('il personale è il rappresentante anche se la sua classe è la meno numerosa (RF-21)', () => {
    // nome non esatto: col nome esatto vincerebbe già prima (RF-21), e questo
    // test parla del rappresentante, non di quel ramo
    const mio = food('Yogurt Greco della Nonna', true, [], { kcal: 60, p: 10, c: 4, f: 0 })
    const uno = food('Yogurt Greco Decò', false, [], { kcal: 56, p: 9, c: 5, f: 0 })
    const due = food('Yogurt Greco Crai', false, [], { kcal: 56, p: 9, c: 5, f: 0 })

    const result = resolveFoodByName('yogurt greco', [mio, uno, due], { grams: 200 })

    expect(result.kind).toBe('ambiguous')
    if (result.kind === 'ambiguous') {
      expect(result.representative).toBe(mio)
    }
  })

  // D-032: l'equivalenza si valuta sulla porzione, e la porzione cambia la
  // risposta — a 30 g la scelta non muove nessuna cifra che l'utente vedrà
  it('la stessa coppia si chiede a 200 g e si tace a 30 g', () => {
    const a = food('Yogurt Auchan', false, [], { kcal: 58, p: 9, c: 5, f: 0 })
    const b = food('Yogurt Despar', false, [], { kcal: 55, p: 9, c: 5, f: 0 })

    expect(resolveFoodByName('yogurt', [a, b], { grams: 200 }).kind).toBe('ambiguous')
    expect(resolveFoodByName('yogurt', [a, b], { grams: 30 })).toEqual({ kind: 'resolved', food: a })
  })

  it('nessun candidato → unknown', () => {
    expect(resolveFoodByName('unicorno', [])).toEqual({ kind: 'unknown' })
  })

  it('l\'apostrofo non separa query e catalogo («burro d\'arachidi» ↔ «Burro di Arachidi»)', () => {
    const burro = food('Burro di Arachidi')

    const result = resolveFoodByName("burro d'arachidi", [burro, food('Burro')])

    expect(result).toEqual({ kind: 'resolved', food: burro })
  })
})

describe('sameNutrition', () => {
  it('equivalenti quando rendono identici a schermo (19,44 P e 19,4 P)', () => {
    expect(
      sameNutrition({ kcal: 92, p: 19.44, c: 0, f: 0.8 }, { kcal: 92, p: 19.4, c: 0, f: 0.8 }),
    ).toBe(true)
  })

  // D-033: e restano equivalenti **a ogni porzione**. Prima della fetta questa
  // coppia si separava a 200 g (38,9 contro 38,8) per un decimo di grammo nato
  // dall'arrotondamento della fonte, e la domanda che R-37 cita come «senza
  // informazione» tornava a essere una domanda
  it.each([30, 100, 200, 250])('gli stessi due restano equivalenti a %i g', (grams) => {
    expect(
      sameNutrition({ kcal: 92, p: 19.44, c: 0, f: 0.8 }, { kcal: 92, p: 19.4, c: 0, f: 0.8 }, grams),
    ).toBe(true)
  })

  it('difformi appena una cifra visibile cambia', () => {
    expect(sameNutrition({ kcal: 92, p: 19.4, c: 0, f: 0.8 }, { kcal: 93, p: 19.4, c: 0, f: 0.8 })).toBe(false)
    expect(sameNutrition({ kcal: 92, p: 19.4, c: 0, f: 0.8 }, { kcal: 92, p: 19.5, c: 0, f: 0.8 })).toBe(false)
  })

  // D-032: le cifre si rendono sulla porzione. 55 e 58 kcal/100 g sono 17 e 17
  // su 30 g, 110 e 116 su 200 g: la seconda è una differenza che l'utente vede
  it('la porzione decide: equivalenti su 30 g, difformi su 200 g', () => {
    const a = { kcal: 55, p: 9, c: 5, f: 0 }
    const b = { kcal: 58, p: 9, c: 5, f: 0 }

    expect(sameNutrition(a, b, 30)).toBe(true)
    expect(sameNutrition(a, b, 200)).toBe(false)
    expect(sameNutrition(a, b)).toBe(false)
  })
})

describe('representativeOf', () => {
  it('a parità di dimensione vince la classe che viene prima', () => {
    const primo = food('Primo', false, [], { ...PER100, kcal: 100 })
    const secondo = food('Secondo', false, [], { ...PER100, kcal: 200 })

    expect(
      representativeOf([
        { food: primo, size: 1 },
        { food: secondo, size: 1 },
      ]),
    ).toBe(primo)
  })
})

describe('equivalenceClasses', () => {
  it('dentro la classe la riga personale prende il posto della prima (RF-21)', () => {
    const canonico = food('Yogurt', false, [], PER100)
    const mio = food('Yogurt mio', true, [], PER100)

    const classes = equivalenceClasses([canonico, mio])

    expect(classes).toEqual([{ food: mio, size: 2 }])
  })
})
