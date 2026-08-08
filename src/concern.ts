import { z } from 'zod'

// I codici che l'agente può **osservare** (backend.md §6.1). Enum chiuso: il modello
// registra ciò che vede in una di queste categorie, non ne inventa di nuove — e
// l'insieme resta confrontabile nel tempo, che è il punto di un segnale.
export const ObservedConcernCodeSchema = z.enum([
  'guilt', // colpa esplicita per ciò che si è mangiato
  'single_food_fixation', // ossessione per un singolo alimento
  'social_avoidance', // evitare situazioni sociali per il cibo
  'compensation', // richieste di "compensare" un pasto
])

// L'evento «richiesta di scendere sotto il floor». ⚠️ Singolare: è l'accaduto, non il
// segnale. Il segnale è `floor_requests`, che nasce dalla soglia di §6.1 (≥2 in 14 gg).
export const FLOOR_REQUEST_EVENT = 'floor_request'

export type ObservedConcernCode = z.infer<typeof ObservedConcernCodeSchema>
