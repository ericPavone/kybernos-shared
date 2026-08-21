import { describe, expect, it } from 'vitest'
import { ImageRefSchema, ImageResponseSchema, ImageUploadSchema } from './image'

const ID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'

describe('la foto mandata all’assistente', () => {
  it('il caricamento porta il base64, e nient’altro', () => {
    expect(ImageUploadSchema.parse({ data: 'AAAA' })).toEqual({ data: 'AAAA' })
    expect(ImageUploadSchema.safeParse({ data: '' }).success).toBe(false)
  })

  // ⚠️ Il tetto sta qui e non solo nel body limit: sforarlo lato server dà un
  // 413 senza envelope, cioè un errore che il client non sa leggere
  it('oltre i 700 000 caratteri si ferma qui, non al body limit', () => {
    expect(ImageUploadSchema.safeParse({ data: 'a'.repeat(700_000) }).success).toBe(true)
    expect(ImageUploadSchema.safeParse({ data: 'a'.repeat(700_001) }).success).toBe(false)
  })

  it('la lettura porta i byte, il riferimento no', () => {
    const piena = { id: ID, byteSize: 1024, data: 'AAAA' }
    expect(ImageResponseSchema.parse(piena)).toEqual(piena)
    expect(ImageRefSchema.parse(piena)).toEqual({ id: ID, byteSize: 1024 })
  })

  it('una foto vuota non è una foto: `byteSize` è positivo', () => {
    expect(ImageResponseSchema.safeParse({ id: ID, byteSize: 0, data: 'x' }).success).toBe(false)
  })
})
