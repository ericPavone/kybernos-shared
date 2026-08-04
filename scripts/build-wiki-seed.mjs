// Genera il corpo di una migration di seed del corpus wiki (backend §6.5).
// Il markdown in repo è la sorgente, Postgres il runtime: il backend non legge il filesystem.
//
//   node scripts/build-wiki-seed.mjs <corpus_version> <file-migration.sql>
//
// Fallisce se la biiezione articles.json ↔ file markdown non regge.

import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')
const corpusDir = resolve(repoRoot, 'kybernos-shared/resources/wiki/nutrition')
const metadataFile = resolve(repoRoot, 'extras/_meta/articles.json')

const [corpusVersion, outFile] = process.argv.slice(2)
if (!corpusVersion || !outFile) {
  throw new Error('usage: build-wiki-seed.mjs <corpus_version> <out.sql>')
}

const articles = JSON.parse(readFileSync(metadataFile, 'utf8'))

// index.md è derivato dalla vista wiki_index, non è un articolo
const onDisk = new Set(
  readdirSync(corpusDir)
    .filter((f) => f.endsWith('.md') && f !== 'index.md')
    .map((f) => f.slice(0, -3))
)
const declared = new Set(articles.map((a) => a.slug))
const missingFiles = [...declared].filter((s) => !onDisk.has(s))
const unindexed = [...onDisk].filter((s) => !declared.has(s))
if (missingFiles.length || unindexed.length) {
  throw new Error(
    `corpus incoerente — senza file: ${missingFiles.join(', ')} · non indicizzati: ${unindexed.join(', ')}`
  )
}

const quote = (value) => (value === null || value === undefined ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`)

const rows = articles
  .slice()
  .sort((a, b) => a.slug.localeCompare(b.slug))
  .map((a) => {
    const body = readFileSync(resolve(corpusDir, `${a.slug}.md`), 'utf8')
    const hash = createHash('sha256').update(body).digest('hex')
    return (
      'INSERT INTO "wiki_article" ' +
      '("slug", "title", "description", "category", "body", "word_count", "source_url", "content_hash", "corpus_version", "origin") VALUES (' +
      [
        quote(a.slug),
        quote(a.title),
        quote(a.description),
        quote(a.category),
        quote(body),
        Number(a.word_count),
        quote(a.source_url),
        quote(hash),
        quote(corpusVersion),
        `'seed'`,
      ].join(', ') +
      ');'
    )
  })

const header = [
  `-- Seed del corpus wiki, corpus_version ${corpusVersion} (backend §6.5).`,
  `-- Generato da scripts/build-wiki-seed.mjs: non modificare a mano.`,
  `-- ${rows.length} articoli da kybernos-shared/resources/wiki/nutrition/.`,
  '',
].join('\n')

writeFileSync(outFile, header + rows.join('\n--> statement-breakpoint\n') + '\n')
process.stdout.write(`${rows.length} articoli → ${outFile}\n`)
