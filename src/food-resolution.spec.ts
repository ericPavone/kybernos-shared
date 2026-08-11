import { describe, expect, it } from 'vitest'
import { resolveFoodByName, sameNutrition, type Per100 } from './food-resolution'

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

    expect(result).toEqual({ kind: 'ambiguous', candidates: [light, olio] })
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

    expect(result).toEqual({ kind: 'ambiguous', candidates: [bar] })
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

    expect(result).toEqual({ kind: 'ambiguous', candidates: [uno, due] })
  })

  it('più corrispondenze → ambiguous con al massimo 4 candidati', () => {
    const candidates = Array.from({ length: 8 }, (_, i) =>
      food(`Mozzarella ${i}`, false, [], { ...PER100, kcal: 100 + i }),
    )

    const result = resolveFoodByName('mozzarella', candidates)

    expect(result.kind).toBe('ambiguous')
    if (result.kind === 'ambiguous') {
      expect(result.candidates).toEqual(candidates.slice(0, 4))
    }
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

  it('difformi appena una cifra visibile cambia', () => {
    expect(sameNutrition({ kcal: 92, p: 19.4, c: 0, f: 0.8 }, { kcal: 93, p: 19.4, c: 0, f: 0.8 })).toBe(false)
    expect(sameNutrition({ kcal: 92, p: 19.4, c: 0, f: 0.8 }, { kcal: 92, p: 19.5, c: 0, f: 0.8 })).toBe(false)
  })
})
