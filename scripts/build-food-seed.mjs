// Genera il corpo di una migration di seed del catalogo food dai JSON FatSecret
// (kybernos-shared/resources/foods/fatsecret/*.json, prodotti dallo scraper).
//
//   node scripts/build-food-seed.mjs <source_version> <file-migration.sql>
//
// Gli id sono UUID deterministici dal sourceId e ogni INSERT ha ON CONFLICT DO
// NOTHING: quando arrivano nuove marche si rigenera in una NUOVA migration e
// passano solo le righe nuove (il migrator non riapplica i file cambiati).
// Dati proprietari FatSecret: uso personale, non ridistribuire.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const foodsDir = resolve(here, '../resources/foods/fatsecret')

const [sourceVersion, outFile] = process.argv.slice(2)
if (!sourceVersion || !outFile) {
  throw new Error('usage: build-food-seed.mjs <source_version> <out.sql>')
}

// uuid stabile derivato dal sourceId (stile v5, su sha1)
const uuidFrom = (sourceId) => {
  const h = createHash('sha1').update(`kybernos:fatsecret:${sourceId}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

const plausible = (r) =>
  r.kcal100 >= 0 && r.kcal100 <= 950 &&
  [r.fat100, r.carbs100, r.protein100].every((v) => v >= 0 && v <= 100)

const seen = new Set()
const skipped = []
const records = []
for (const file of readdirSync(foodsDir).filter((f) => f.endsWith('.json')).sort()) {
  for (const r of JSON.parse(readFileSync(resolve(foodsDir, file), 'utf8'))) {
    const sourceId = r.provenance.sourceId
    if (seen.has(sourceId)) continue
    seen.add(sourceId)
    if (!plausible(r)) {
      skipped.push(`${r.name} (${sourceId})`)
      continue
    }
    records.push({ ...r, id: uuidFrom(sourceId) })
  }
}
records.sort((a, b) => a.provenance.sourceId.localeCompare(b.provenance.sourceId))

const quote = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replaceAll("'", "''")}'`)

const BATCH = 500
const batches = []
for (let i = 0; i < records.length; i += BATCH) {
  batches.push(records.slice(i, i + BATCH))
}

const foodInserts = batches.map(
  (batch) =>
    'INSERT INTO "food" ("id", "kind", "name", "brand", "kcal_100", "protein_100", "carbs_100", "fat_100", "origin") VALUES\n' +
    batch
      .map((r) =>
        `(${quote(r.id)}, 'canonical', ${quote(r.name)}, ${quote(r.brand)}, ${r.kcal100}, ${r.protein100}, ${r.carbs100}, ${r.fat100}, 'seed')`
      )
      .join(',\n') +
    '\nON CONFLICT ("id") DO NOTHING;'
)

const provenanceInserts = batches.map(
  (batch) =>
    'INSERT INTO "food_provenance" ("food_id", "source", "source_id", "source_version", "license", "origin") VALUES\n' +
    batch
      .map((r) =>
        `(${quote(r.id)}, 'fatsecret', ${quote(r.provenance.sourceId)}, ${quote(sourceVersion)}, ${quote(r.provenance.license)}, 'seed')`
      )
      .join(',\n') +
    '\nON CONFLICT ("food_id") DO NOTHING;'
)

const header = [
  `-- Seed del catalogo food da FatSecret, source_version ${sourceVersion} (RF-20).`,
  `-- Generato da scripts/build-food-seed.mjs: non modificare a mano.`,
  `-- ${records.length} alimenti canonici, ${skipped.length} scartati dal filtro di plausibilità.`,
  `-- Dati proprietari: uso personale, non ridistribuire.`,
  '',
].join('\n')

writeFileSync(outFile, header + [...foodInserts, ...provenanceInserts].join('\n--> statement-breakpoint\n') + '\n')
process.stdout.write(`${records.length} alimenti → ${outFile}\n`)
if (skipped.length) {
  process.stdout.write(`scartati (${skipped.length}): ${skipped.join(' · ')}\n`)
}
