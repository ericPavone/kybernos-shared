import { describe, expect, it } from 'vitest'
import { PageRequestSchema, offsetOf, toPage } from './pagination'

describe('PageRequestSchema', () => {
  it('applica i default page=1 e pageSize=20', () => {
    expect(PageRequestSchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it('coercizza le stringhe della query in numeri', () => {
    expect(PageRequestSchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    })
  })

  it('rifiuta pageSize oltre 100', () => {
    expect(PageRequestSchema.safeParse({ pageSize: 101 }).success).toBe(false)
  })

  it('rifiuta page sotto 1', () => {
    expect(PageRequestSchema.safeParse({ page: 0 }).success).toBe(false)
  })

  it('rifiuta page non intero', () => {
    expect(PageRequestSchema.safeParse({ page: 1.5 }).success).toBe(false)
  })

  it('accetta i valori limite page=1 e pageSize=100', () => {
    expect(PageRequestSchema.parse({ page: '1', pageSize: '100' })).toEqual({
      page: 1,
      pageSize: 100,
    })
  })

  it('rifiuta pageSize 0 e valori negativi', () => {
    expect(PageRequestSchema.safeParse({ pageSize: 0 }).success).toBe(false)
    expect(PageRequestSchema.safeParse({ page: -1 }).success).toBe(false)
    expect(PageRequestSchema.safeParse({ pageSize: -5 }).success).toBe(false)
  })

  it('rifiuta stringhe non numeriche', () => {
    expect(PageRequestSchema.safeParse({ page: 'abc' }).success).toBe(false)
    expect(PageRequestSchema.safeParse({ pageSize: '2x' }).success).toBe(false)
  })
})

describe('offsetOf', () => {
  it('calcola l offset come (page-1)*pageSize', () => {
    expect(offsetOf({ page: 3, pageSize: 20 })).toBe(40)
  })
})

describe('toPage', () => {
  it('calcola totalPages con arrotondamento per eccesso', () => {
    expect(toPage([], { page: 1, pageSize: 20 }, 41).totalPages).toBe(3)
  })

  it('totalItems 0 produce totalPages 0, non 1', () => {
    expect(toPage([], { page: 1, pageSize: 20 }, 0).totalPages).toBe(0)
  })

  it('un multiplo esatto non aggiunge una pagina in più', () => {
    expect(toPage([], { page: 1, pageSize: 20 }, 40).totalPages).toBe(2)
  })

  it('riporta items, page, pageSize e totalItems della richiesta', () => {
    expect(toPage(['a'], { page: 2, pageSize: 10 }, 11)).toEqual({
      items: ['a'],
      page: 2,
      pageSize: 10,
      totalItems: 11,
      totalPages: 2,
    })
  })
})
