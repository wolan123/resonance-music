import puppeteer from 'puppeteer-core'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SHOT_DIR = process.env.SHOT_DIR || '.'

// --- generate a test WAV + LRC pair with a unique name ---
const dir = mkdtempSync(path.join(tmpdir(), 'lumen-qa-'))
const songName = `qa-song-${Date.now().toString(36)}`
const wavPath = path.join(dir, `${songName}.wav`)
const sr = 22050
const seconds = 6
const n = Math.floor(sr * seconds)
const dataSize = n * 2
const buf = Buffer.alloc(44 + dataSize)
buf.write('RIFF', 0)
buf.writeUInt32LE(36 + dataSize, 4)
buf.write('WAVE', 8)
buf.write('fmt ', 12)
buf.writeUInt32LE(16, 16)
buf.writeUInt16LE(1, 20)
buf.writeUInt16LE(1, 22)
buf.writeUInt32LE(sr, 24)
buf.writeUInt32LE(sr * 2, 28)
buf.writeUInt16LE(2, 32)
buf.writeUInt16LE(16, 34)
buf.write('data', 36)
buf.writeUInt32LE(dataSize, 40)
for (let i = 0; i < n; i += 1) {
  const v = Math.round(Math.sin((2 * Math.PI * 440 * i) / sr) * 12000)
  buf.writeInt16LE(v, 44 + i * 2)
}
writeFileSync(wavPath, buf)
const lrcPath = path.join(dir, `${songName}.lrc`)
writeFileSync(lrcPath, '[00:00.00]QA歌词第一行\n[00:02.00]QA歌词第二行\n', 'utf8')

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes(t))
    if (b) b.click()
  }, text)
}

async function exactClick(page, text) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t)
    if (b) b.click()
  }, text)
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 960 })
page.on('dialog', (d) => d.accept())

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))
page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url()} ${r.failure()?.errorText || ''}`))
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`)
})

const results = {}
const uname = `qa-${Date.now().toString(36)}`
const pass = 'qa-password-123'

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })

results.brand = await page
  .waitForFunction(() => document.body.innerText.includes('LUMEN'), { timeout: 15000 })
  .then(() => true)
  .catch(() => false)
results.hall = await page
  .waitForFunction(() => document.body.innerText.includes('都有一片光'), { timeout: 15000 })
  .then(() => true)
  .catch(() => false)

// --- register a new account ---
await clickByText(page, '登录 / 注册')
await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
await exactClick(page, '注册')
await page.type('input[autocomplete="username"]', uname)
await page.type('input[type="password"]', pass)
await page.click('button[type="submit"]')
results.registered = await page
  .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, uname)
  .then(() => true)
  .catch(() => false)

// --- upload WAV + LRC while logged in ---
await clickByText(page, '上传')
results.uploadView = await page
  .waitForFunction(() => document.body.innerText.includes('拖进来，或者点这里选择文件'), { timeout: 10000 })
  .then(() => true)
  .catch(() => false)
const input = await page.$('input[type="file"]')
await input.uploadFile(wavPath, lrcPath)
results.parsed = await page
  .waitForFunction(() => document.body.innerText.includes('自动读取了元数据和封面'), { timeout: 20000 })
  .then(() => true)
  .catch(() => false)

await clickByText(page, '发布到音乐大厅')
results.published = await page
  .waitForFunction(
    (name, u) => document.body.innerText.includes(name) && document.body.innerText.includes(`${u} 上传`),
    { timeout: 60000 },
    songName,
    uname,
  )
  .then(() => true)
  .catch(() => false)

// --- play the uploaded song (first row) ---
const playBtn = await page.$('button[aria-label^="播放"]')
if (playBtn) {
  await playBtn.click()
  results.playPressed = true
}
await new Promise((r) => setTimeout(r, 2000))
results.isPlaying = !!(await page.$('button[aria-label="暂停"]'))

// --- lyrics panel (LRC from upload) ---
await clickByText(page, '歌词')
results.lyricsPanel = await page
  .waitForFunction(() => document.body.innerText.includes('QA歌词第一行'), { timeout: 10000 })
  .then(() => true)
  .catch(() => false)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-label="关闭歌词"]')][0]
  if (b) b.click()
})

// --- effect mode menu ---
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '播放特效')
  if (b) b.click()
})
await page
  .waitForFunction(() => [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === '极光'), {
    timeout: 5000,
  })
  .catch(() => {})
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('流动极光 + 光点'))
  if (b) b.click()
})
results.effectChanged = await page
  .waitForFunction(() => [...document.querySelectorAll('button')].some((x) => x.textContent.includes('特效 极光')), {
    timeout: 5000,
  })
  .then(() => true)
  .catch(() => false)
results.canvasAfterEffect = !!(await page.$('canvas'))

// --- light toggle ---
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '光效')
  if (b) b.click()
})
await new Promise((r) => setTimeout(r, 500))
results.canvasAfterToggleOff = !!(await page.$('canvas'))
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '光效')
  if (b) b.click()
})
await new Promise((r) => setTimeout(r, 300))
results.canvasAfterToggleOn = !!(await page.$('canvas'))

// --- favorites ---
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '收藏')
  if (b) b.click()
})
await clickByText(page, '收藏')
results.favoritesShown = await page
  .waitForFunction((name) => document.body.innerText.includes(name), { timeout: 10000 }, songName)
  .then(() => true)
  .catch(() => false)

// --- permission: delete buttons disappear after logout ---
await clickByText(page, '音乐大厅')
await page
  .waitForFunction((name) => document.body.innerText.includes(name), { timeout: 10000 }, songName)
  .catch(() => {})
results.ownRowHasDelete = await page.evaluate(
  (name) =>
    [...document.querySelectorAll('button[aria-label^="删除"]')].some(
      (b) => b.closest('.group')?.innerText?.includes(name),
    ),
  songName,
)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '退出登录')
  if (b) b.click()
})
await page
  .waitForFunction(() => [...document.querySelectorAll('button')].some((x) => x.textContent.includes('登录 / 注册')), {
    timeout: 10000,
  })
  .catch(() => {})
results.deleteButtonsAfterLogout = await page.$$eval('button[aria-label^="删除"]', (bs) => bs.length)

// --- login again and delete own song ---
await clickByText(page, '登录 / 注册')
await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
await page.type('input[autocomplete="username"]', uname)
await page.type('input[type="password"]', pass)
await page.click('button[type="submit"]')
await page
  .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, uname)
  .catch(() => {})
await new Promise((r) => setTimeout(r, 1500))
results.deleteButtonsAfterLogin = await page.$$eval('button[aria-label^="删除"]', (bs) => bs.length)
const clickedDelete = await page.evaluate((name) => {
  const btn = [...document.querySelectorAll('button[aria-label^="删除"]')].find(
    (b) => b.closest('.group')?.innerText?.includes(name),
  )
  if (!btn) return false
  btn.click()
  return true
}, songName)
if (clickedDelete) {
  results.deleted = await page
    .waitForFunction((name) => !document.body.innerText.includes(name), { timeout: 15000 }, songName)
    .then(() => true)
    .catch(() => false)
} else {
  results.deleted = false
}

results.errors = errors.slice(0, 10)
console.log(JSON.stringify(results, null, 2))

await page.setViewport({ width: 390, height: 844 })
await page.screenshot({ path: path.join(SHOT_DIR, 'qa-lumen-mobile.png') })
await page.setViewport({ width: 1440, height: 960 })
await page.screenshot({ path: path.join(SHOT_DIR, 'qa-lumen-desktop.png') })

await browser.close()
