import { describe, expect, it } from 'vitest'
import { resolveFoodByName } from './food-resolution'

const food = (name: string, personal = false, aliases: { alias: string; gramsFood?: number }[] = []) => ({
  name,
  personal,
  aliases,
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

  it('esatti omonimi (brand diversi) → il primo, non un ambiguo irrisolvibile per nome', () => {
    const coop = { ...food('Tonno al Naturale'), brand: 'Coop' }
    const crai = { ...food('Tonno al Naturale'), brand: 'Crai' }

    const result = resolveFoodByName('tonno al naturale', [coop, crai])

    expect(result).toEqual({ kind: 'resolved', food: coop })
  })

  it('candidato unico non esatto → resolved', () => {
    const result = resolveFoodByName('mozzar', [food('Mozzarella di bufala')])

    expect(result).toEqual({ kind: 'resolved', food: food('Mozzarella di bufala') })
  })

  it('più corrispondenze → ambiguous con al massimo 4 candidati', () => {
    const candidates = Array.from({ length: 8 }, (_, i) => food(`Mozzarella ${i}`))

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
