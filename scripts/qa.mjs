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
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })

results.brand = await page
  .waitForFunction(() => document.body.innerText.includes('LUMEN 流光音乐'), { timeout: 15000 })
  .then(() => true)
  .catch(() => false)
results.hall = await page
  .waitForFunction(() => document.body.innerText.includes('都有一片光'), { timeout: 15000 })
  .then(() => true)
  .catch(() => false)

// --- go to upload view ---
await clickByText(page, '上传')
results.uploadView = await page
  .waitForFunction(() => document.body.innerText.includes('拖进来，或者点这里选择文件'), { timeout: 10000 })
  .then(() => true)
  .catch(() => false)

// --- upload WAV + LRC ---
const input = await page.$('input[type="file"]')
await input.uploadFile(wavPath, lrcPath)
results.parsed = await page
  .waitForFunction(() => document.body.innerText.includes('自动读取了元数据和封面'), { timeout: 20000 })
  .then(() => true)
  .catch(() => false)

await clickByText(page, '发布到音乐大厅')
await new Promise((r) => setTimeout(r, 4000))
results.publishErrorShown = await page.evaluate(() => {
  const m = document.body.innerText.match(/(读取歌曲信息失败[^\n]*|上传失败[^\n]*)/)
  return m ? m[0] : ''
})
results.debugState = await page.evaluate((name) => ({
  url: location.href,
  onUploadView: document.body.innerText.includes('上传音乐'),
  onHall: document.body.innerText.includes('音乐大厅'),
  hasSongText: document.body.innerText.includes(name),
  hasUploader: document.body.innerText.includes('匿名听众'),
  h1: document.querySelector('h1')?.textContent || '',
}), songName)
results.published = await page
  .waitForFunction(() => document.body.innerText.includes('匿名听众'), { timeout: 40000 })
  .then(() => true)
  .catch(() => false)

// --- play the uploaded song (it is the first row) ---
await new Promise((r) => setTimeout(r, 800))
const playBtn = await page.$('button[aria-label^="播放"]')
if (playBtn) {
  await playBtn.click()
  results.playPressed = true
}
await new Promise((r) => setTimeout(r, 2500))
results.isPlaying = !!(await page.$('button[aria-label="暂停"]'))

// --- lyrics panel ---
await clickByText(page, '歌词')
results.lyricsPanel = await page
  .waitForFunction((name) => document.body.innerText.includes('QA歌词第一行'), { timeout: 10000 }, songName)
  .then(() => true)
  .catch(() => false)
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-label="关闭歌词"]')][0]
  if (b) b.click()
})

// --- immersive light canvas + toggle ---
results.canvas = !!(await page.$('canvas'))
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
const favBtn = await page.$('button[aria-label="收藏"]')
if (favBtn) {
  await favBtn.click()
  results.favorited = true
}
await clickByText(page, '收藏')
results.favoritesShown = await page
  .waitForFunction((name) => document.body.innerText.includes(name), { timeout: 10000 }, songName)
  .then(() => true)
  .catch(() => false)

// --- cleanup: delete the uploaded song ---
await clickByText(page, '音乐大厅')
await page.waitForFunction(() => document.body.innerText.includes('都有一片光'), { timeout: 10000 }).catch(() => {})
const delBtn = await page
  .waitForSelector('button[aria-label^="删除"]', { timeout: 10000 })
  .catch(() => null)
if (delBtn) {
  await delBtn.click()
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
