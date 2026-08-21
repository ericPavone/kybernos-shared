import { describe, expect, it } from 'vitest'
import { ProfessionalInputSchema, ProfessionalResponseSchema } from './professional'

const minimo = { name: 'C. Ferrero', credential: 'biologa nutrizionista' }

describe('la scheda di chi ti segue', () => {
  // ⛔ E ciò che non è stato scritto esce come `null`, mai `undefined`: dentro
  // l'`onConflictDoUpdate` del DAO un `undefined` **lascia il valore vecchio**,
  // quindi togliere un contatto non lo toglierebbe
  it('chiede solo il nome e la professione, e i campi non scritti escono a null', () => {
    expect(ProfessionalInputSchema.parse(minimo)).toEqual({
      ...minimo,
      city: null,
      email: null,
      phone: null,
      address: null,
      socials: null,
      since: null,
    })
  })

  it('un nome vuoto non è una scheda', () => {
    expect(ProfessionalInputSchema.safeParse({ ...minimo, name: '' }).success).toBe(false)
  })

  // ⛔ Un numero di studio, un cellulare e un interno si scrivono in dieci modi:
  // rifiutarne uno vero è peggio che accettarne uno storto
  it('il telefono non ha un formato: si accetta come è scritto', () => {
    expect(ProfessionalInputSchema.parse({ ...minimo, phone: '011 48 20 193' }).phone).toBe('011 48 20 193')
  })

  it('l’email invece un formato ce l’ha, ed è quello che la rende toccabile', () => {
    expect(ProfessionalInputSchema.safeParse({ ...minimo, email: 'studio@' }).success).toBe(false)
  })

  it('i social sono un array, non una stringa con le virgole', () => {
    expect(ProfessionalInputSchema.parse({ ...minimo, socials: ['@a', '@b'] }).socials).toEqual(['@a', '@b'])
    expect(ProfessionalInputSchema.safeParse({ ...minimo, socials: '@a, @b' }).success).toBe(false)
  })

  // la forma è del client: qui è una data, e una data sbagliata si ferma qui
  it('`since` è una data, non una frase', () => {
    expect(ProfessionalInputSchema.parse({ ...minimo, since: '2026-02-03' }).since).toBe('2026-02-03')
    expect(ProfessionalInputSchema.safeParse({ ...minimo, since: '3 feb' }).success).toBe(false)
  })

  it('la risposta porta l’id, l’ingresso no', () => {
    const id = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
    expect(ProfessionalResponseSchema.parse({ ...minimo, id }).id).toBe(id)
    expect(ProfessionalResponseSchema.safeParse(minimo).success).toBe(false)
  })
})
