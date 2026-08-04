// Raccoglie gli alimenti a marchio supermercato da fatsecret.it (pagine di ricerca:
// ogni riga espone già nome, brand e kcal/grassi/carboidrati/proteine per 100 g).
// Output: un JSON per marca in resources/foods/fatsecret/<slug>.json, con i campi
// allineati alle colonne di `food` + un blocco provenance per `food_provenance`.
//
//   node scripts/scrape-fatsecret.mjs [slug ...] [--force] [--max-pages N]
//
// Senza argomenti processa tutte le marche in BRANDS. Le marche con JSON già
// presente vengono saltate (riprendibile); --force le riscrape.

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../resources/foods/fatsecret')

const BASE = 'https://www.fatsecret.it'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const DELAY_MS = 3000

// slug fatsecret → query di ricerca ("Vedi tutti i prodotti" della pagina marca)
const BRANDS = {
  lidl: 'Lidl',
  auchan: 'Auchan',
  ins: "In's", // "Discount" della lista: In's Mercato
  esselunga: 'Esselunga',
  carrefour: 'Carrefour',
  conad: 'Conad',
  coop: 'Coop',
  md: 'MD',
  'simply-market': 'Simply',
  'iper-simply': 'Simply',
  crai: 'Crai',
  decò: 'Decò',
  despar: 'Despar',
  eurospin: 'Eurospin',
  famila: 'Famila',
  // sotto-marche
  'carrefour-bio': 'Carrefour Bio',
  'carrefour-discount': 'Carrefour Discount',
  'carrefour-veg': 'Carrefour Veg',
  'conad-piacersi': 'Conad Piacersi',
  'conad-sapori-e-dintorni': 'Sapori e Dintorni',
  'fior-fiore-coop': 'Fior Fiore',
  'solidal-coop': 'Solidal Coop',
  'despar-premium': 'Despar Premium',
  'esselunga-bio': 'Esselunga Bio',
  'esselunga-smart': 'Esselunga Smart',
  'esselunga-top': 'Esselunga Top',
  'simply-basic': 'Simply Basic',
}

const args = process.argv.slice(2)
const force = args.includes('--force')
const maxPagesIdx = args.indexOf('--max-pages')
const maxPages = maxPagesIdx >= 0 ? Number(args[maxPagesIdx + 1]) : Infinity
const slugs = args.filter((a, i) => !a.startsWith('--') && i !== maxPagesIdx + 1)
const targets = slugs.length ? slugs : Object.keys(BRANDS)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const decodeEntities = (s) =>
  s
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replaceAll('&nbsp;', ' ')
    .trim()

const toNumber = (s) => Number(s.replace(',', '.'))

async function fetchPage(url) {
  const attempts = 8
  for (let attempt = 1; attempt <= attempts; attempt++) {
    let res
    try {
      res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (res.ok) return await res.text()
    } catch (err) {
      if (attempt === attempts) throw err
      console.log(`  errore di rete (${err.cause?.code ?? err.message}), riprovo tra 60s (${attempt}/${attempts})`)
      await sleep(60_000)
      continue
    }
    if (attempt === attempts) throw new Error(`${res.status} su ${url}`)
    const retryAfter = Number(res.headers.get('retry-after')) * 1000 || 0
    const wait = res.status === 429 ? Math.max(retryAfter, 120_000 * attempt) : 5000 * attempt
    console.log(`  HTTP ${res.status}, riprovo tra ${wait / 1000}s (${attempt}/${attempts})`)
    await sleep(wait)
  }
}

// Una riga di risultato: link prodotto, link marca, riga "per 100g - Calorie: ... | Gras: ... | Carb: ... | Prot: ..."
const ROW_RE =
  /<a class="prominent" href="(\/calorie-nutrizione\/[^"]+)">([^<]+)<\/a>[^<]*<a class="brand" href="(\/calorie-nutrizione\/[^"]+)">\(([^)]+)\)<\/a>\s*<div class="smallText greyText greyLink">\s*per ([^-]+?) - Calorie: ([\d.,]+)kcal \| Gras: ([\d.,]+)g \| Carb: ([\d.,]+)g \| Prot: ([\d.,]+)g/g

function parseRows(html, brandSlug) {
  const rows = []
  let skippedPortion = 0
  let totalRows = 0
  for (const m of html.matchAll(ROW_RE)) {
    totalRows++
    const [, productHref, rawName, brandHref, rawBrand, per, kcal, fat, carbs, protein] = m
    if (decodeURIComponent(brandHref) !== `/calorie-nutrizione/${brandSlug}`) continue

    // base quantitativa: "100g" diretto, "N g" o "1 porzione (N g)" riscalati; il resto si scarta
    let grams = null
    const perClean = decodeEntities(per)
    const gMatch = perClean.match(/^(\d+(?:[.,]\d+)?)\s*g$/) ?? perClean.match(/\((\d+(?:[.,]\d+)?)\s*g\)/)
    if (gMatch) grams = toNumber(gMatch[1])
    if (!grams) {
      skippedPortion++
      continue
    }
    const scale = 100 / grams

    rows.push({
      name: decodeEntities(rawName),
      brand: decodeEntities(rawBrand),
      kcal100: Math.round(toNumber(kcal) * scale * 10) / 10,
      fat100: Math.round(toNumber(fat) * scale * 100) / 100,
      carbs100: Math.round(toNumber(carbs) * scale * 100) / 100,
      protein100: Math.round(toNumber(protein) * scale * 100) / 100,
      provenance: {
        source: 'fatsecret',
        sourceId: decodeURIComponent(productHref).replace(/\/100g$/, ''),
        license: 'proprietary',
      },
    })
  }
  return { rows, skippedPortion, totalRows }
}

async function scrapeBrand(slug, query) {
  const byId = new Map()
  let total = null
  let skipped = 0

  for (let pg = 0; pg < maxPages; pg++) {
    const url = `${BASE}/calorie-nutrizione/search?q=${encodeURIComponent(query)}&pg=${pg}`
    const html = await fetchPage(url)

    const summary = html.match(/da&#160;(\d+) a&#160;(\d+) di&#160;([\d.,]+)/)
    if (summary) total = Number(summary[3].replace(/[.,]/g, ''))

    const { rows, skippedPortion, totalRows } = parseRows(html, slug)
    skipped += skippedPortion
    for (const r of rows) if (!byId.has(r.provenance.sourceId)) byId.set(r.provenance.sourceId, r)

    // fine quando la ricerca è esaurita, non quando una pagina non ha righe della marca
    const lastPage = summary ? Number(summary[2]) >= total : totalRows === 0
    if (pg % 10 === 0 || lastPage)
      console.log(`  ${slug}: pg ${pg} — ${byId.size} prodotti${total ? ` (ricerca: ${total} risultati)` : ''}`)
    if (lastPage) break
    await sleep(DELAY_MS)
  }

  return { foods: [...byId.values()], skipped }
}

mkdirSync(outDir, { recursive: true })

for (const slug of targets) {
  const query = BRANDS[slug]
  if (!query) {
    console.error(`marca sconosciuta: ${slug} (note: ${Object.keys(BRANDS).join(', ')})`)
    process.exitCode = 1
    continue
  }
  const outFile = resolve(outDir, `${slug}.json`)
  if (!force && existsSync(outFile)) {
    console.log(`${slug}: già presente, salto (--force per riscrape)`)
    continue
  }
  console.log(`${slug} (q=${query})…`)
  const { foods, skipped } = await scrapeBrand(slug, query)
  writeFileSync(outFile, JSON.stringify(foods, null, 2) + '\n')
  console.log(`${slug}: ${foods.length} alimenti → ${outFile}${skipped ? ` (${skipped} righe non per-grammi scartate)` : ''}`)
  await sleep(DELAY_MS)
}

console.log(`\nfile in ${outDir}: ${readdirSync(outDir).join(', ')}`)
