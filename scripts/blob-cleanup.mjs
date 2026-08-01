// Clean orphaned audio files (keep registered song JSON files).
import { readFileSync } from 'node:fs'
import { del, list } from '@vercel/blob'

function loadEnv() {
  const text = readFileSync('.env.local', 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}

loadEnv()

async function main() {
  const { blobs } = await list({ prefix: '' })
  const orphans = blobs.filter((b) => !b.pathname.includes('/') && b.pathname.endsWith('.wav'))
  for (const b of orphans) {
    try {
      await del(b.url)
      console.log('deleted orphan:', b.pathname)
    } catch (e) {
      console.log('FAILED to delete:', b.pathname, e.message)
    }
  }
  if (!orphans.length) console.log('no orphan wav files')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
