import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      // Cliquet anti-regressione: i valori sono quelli **misurati**, non un
      // obiettivo, e si rialzano a fine ondata. Misurati il 16 ago 2026, dopo
      // l'ondata Y — 22 sorgenti, 22 suite, nessuna esclusione oltre agli spec.
      //
      // ⚠️ Shared tiene la barra più alta dei tre perché è il **contratto** fra
      // i repo: un ramo scoperto qui costa in tre posti, e i branch sono
      // esattamente dove una regressione si nasconde in silenzio.
      //
      // ⛔ 100 esatto non è fragilità: i branch a 97,64 assorbono già il caso
      // del default irraggiungibile. Se un giorno servirà una riga scoperta, si
      // abbassa la soglia **e si scrive perché** — è lo stesso atto che
      // aggiungere una voce a un allowlist. Abbassarla prima toglie l'obbligo
      // di giustificarsi, ed è così che un cliquet muore.
      thresholds: {
        statements: 100,
        branches: 97.64,
        functions: 100,
        lines: 100,
      },
    },
  },
})
