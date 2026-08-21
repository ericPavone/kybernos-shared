import { z } from 'zod'

// Le foto mandate all'assistente **si conservano, anche sul server**.
//
// ⛔ Questo rovescia `RNF-07` («Le immagini non si conservano»), revocato da
// Eric il 21 agosto 2026: senza un archivio non c'era modo di rivedere nella
// conversazione la foto appena mandata, e il campo `imageId` qui accanto era una
// lapide che dichiarava proprio quel divieto.
//
// ⚠️ Il tetto sta QUI e non solo nel body limit di Fastify: sforare il limite del
// server dà un 413 senza envelope, cioè un errore che il client non sa leggere.
// 700 000 caratteri ≈ 525 KB di JPEG, e il client ridimensiona molto sotto —
// questa è la rete, non la misura.
export const ImageUploadSchema = z.object({
  data: z.string().min(1).max(700_000),
})

// ⛔ La lettura torna il base64 dentro l'envelope, non i byte grezzi: così la
// foto vive nella memoria di react-query e **non** nella cache immagini nativa,
// che sta su disco. È ciò che tiene vera la metà della promessa che resta —
// *sul telefono non resta*.
export const ImageResponseSchema = z.object({
  id: z.string().uuid(),
  byteSize: z.number().int().positive(),
  data: z.string(),
})

// Quello che basta al client dopo un caricamento: l'id da mettere sul turno.
export const ImageRefSchema = ImageResponseSchema.omit({ data: true })

export type ImageUpload = z.infer<typeof ImageUploadSchema>
export type ImageResponse = z.infer<typeof ImageResponseSchema>
export type ImageRef = z.infer<typeof ImageRefSchema>
