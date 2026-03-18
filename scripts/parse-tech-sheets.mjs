import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { extractText } from 'unpdf'

const dir = 'public/tech-sheets'
const files = readdirSync(dir).filter(f => f.endsWith('.pdf'))
const results = {}

for (const file of files) {
  try {
    const buf = readFileSync(`${dir}/${file}`)
    const uint8 = new Uint8Array(buf)
    const { text } = await extractText(uint8)
    const combined = Array.isArray(text) ? text.join('\n\n') : String(text)
    results[file] = combined
    console.log(`✓ ${file} (${combined.length} chars)`)
  } catch (e) {
    console.error(`✗ ${file}: ${e.message}`)
    results[file] = `ERROR: ${e.message}`
  }
}

// Also parse the big PDFs (first pages only via text extraction)
for (const bigFile of [
  'public/Greenmood_Company_Presentation_2025.pdf',
  'public/Greenmood_Design-Collection_2025.pdf'
]) {
  try {
    const buf = readFileSync(bigFile)
    const uint8 = new Uint8Array(buf)
    const { text } = await extractText(uint8)
    const combined = Array.isArray(text) ? text.slice(0, 30).join('\n\n') : String(text).substring(0, 15000)
    results[bigFile] = combined
    console.log(`✓ ${bigFile} (${combined.length} chars, first 30 pages)`)
  } catch (e) {
    console.error(`✗ ${bigFile}: ${e.message}`)
  }
}

writeFileSync('scripts/parsed-tech-sheets.json', JSON.stringify(results, null, 2))
console.log(`\nDone. ${Object.keys(results).length} files parsed.`)
