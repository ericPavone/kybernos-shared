import { describe, expect, it } from 'vitest'
import { normalizeApostrophes, normalizeForMatch, searchVariants } from './food-text'

describe('normalizeApostrophes', () => {
  it('porta gli apostrofi tipografici a quello dritto', () => {
    expect(normalizeApostrophes('Fiocchi D’Avena')).toBe("Fiocchi D'Avena")
    expect(normalizeApostrophes('pane all‘olio')).toBe("pane all'olio")
    expect(normalizeApostrophes("burro d'arachidi")).toBe("burro d'arachidi")
  })
})

describe('searchVariants', () => {
  it('il caso del banco: «burro d\'arachidi» genera la forma estesa', () => {
    expect(searchVariants("burro d'arachidi")).toContain('burro di arachidi')
  })

  it('la forma estesa genera quella elisa («fiocchi di avena» → «fiocchi d\'avena»)', () => {
    expect(searchVariants('fiocchi di avena')).toContain("fiocchi d'avena")
  })

  it('la query con apostrofo tipografico si comporta come quella con il dritto', () => {
    expect(searchVariants('burro d’arachidi')).toEqual(searchVariants("burro d'arachidi"))
  })

  it('senza elisioni resta una variante sola', () => {
    expect(searchVariants('  mozzarella ')).toEqual(['mozzarella'])
  })

  it('«di» davanti a consonante non viene eliso', () => {
    expect(searchVariants('petto di pollo')).toEqual(['petto di pollo'])
  })
})

describe('normalizeForMatch', () => {
  it('query utente e nome di catalogo convergono sulla stessa forma', () => {
    expect(normalizeForMatch("burro d'arachidi")).toBe(normalizeForMatch('Burro di Arachidi'))
  })

  it('un alias con apostrofo tipografico matcha la query col dritto', () => {
    expect(normalizeForMatch('pane all’olio')).toBe(normalizeForMatch("pane all'olio"))
  })

  it('le stopword non pesano nel confronto', () => {
    expect(normalizeForMatch('petto di pollo')).toBe('petto pollo')
  })

  it('l\'underscore vale come spazio (t06: nomi in snake_case dal modello)', () => {
    expect(normalizeForMatch('banana_media')).toBe(normalizeForMatch('Banana media'))
    expect(normalizeForMatch('pane_100g')).toBe('pane 100g')
  })
})
