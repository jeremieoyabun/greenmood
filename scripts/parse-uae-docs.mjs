import { readFileSync } from 'fs'
import { extractText } from 'unpdf'

async function parse(file) {
  const buf = readFileSync(file)
  const { text, totalPages } = await extractText(new Uint8Array(buf))
  const combined = Array.isArray(text) ? text.join('\n\n---PAGE---\n\n') : String(text)
  console.log(`=== ${file} (${totalPages} pages) ===`)
  console.log(combined)
  console.log('\n')
}

await parse('public/Greenmood Content Calendar - March 2026.pdf')
await parse('public/Greenmood Marketing Plan Q1.pdf')
