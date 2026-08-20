import { describe, expect, it } from 'vitest'
import { fail, isFail, mapResult, ok } from './result'

describe('ok', () => {
  it('crea un result con status 200 di default', () => {
    expect(ok({ a: 1 })).toEqual({ data: { a: 1 }, errors: [], warnings: [], status: 200 })
  })

  it('preserva status e warnings passati esplicitamente', () => {
    const warnings = [{ code: 'W1', message: 'attenzione' }]
    expect(ok('x', 201, warnings)).toEqual({ data: 'x', errors: [], warnings, status: 201 })
  })
})

describe('fail', () => {
  it('crea un result con data null e gli errori passati', () => {
    const errors = [{ code: 'E1', message: 'errore' }]
    expect(fail(404, errors)).toEqual({ data: null, errors, warnings: [], status: 404 })
  })
})

describe('mapResult', () => {
  it('trasforma i dati preservando status, errors e warnings', () => {
    const warnings = [{ code: 'W1', message: 'w' }]
    const result = ok(2, 201, warnings)
    expect(mapResult(result, (n) => n * 10)).toEqual({
      data: 20,
      errors: [],
      warnings,
      status: 201,
    })
  })

  it('non invoca la fn quando data è null', () => {
    const result = fail<number>(500, [{ code: 'E', message: 'e' }])
    expect(mapResult(result, (n) => n * 10).data).toBeNull()
  })
})

describe('isFail', () => {
  it('è falso su un successo con payload null', () => {
    expect(isFail(ok(null))).toBe(false)
  })

  it('è vero su un fallimento', () => {
    expect(isFail(fail(500, [{ code: 'E', message: 'e' }]))).toBe(true)
  })
})
