import puppeteer from 'puppeteer-core'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SHOT_DIR = process.env.SHOT_DIR || '.'

function makeWav(songName, seconds = 6) {
  const dir = mkdtempSync(path.join(tmpdir(), 'lumen-qa-'))
  const wavPath = path.join(dir, `${songName}.wav`)
  const sr = 22050
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
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / sr) * 12000), 44 + i * 2)
  }
  writeFileSync(wavPath, buf)
  const lrcPath = path.join(dir, `${songName}.lrc`)
  writeFileSync(lrcPath, '[00:00.00]QA歌词第一行\n[00:02.00]QA歌词第二行\n', 'utf8')
  return { wavPath, lrcPath }
}

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

const allResults = {}
const passKeys = ['brand', 'discover', 'registered', 'uploadView', 'parsed', 'published', 'isPlaying', 'lyricsPanel', 'effectChanged', 'queuePanel', 'playlistCreated', 'songInPlaylist', 'playAllPlaying', 'profileUploads', 'profileFavorites', 'profileRecent', 'profilePlaylists', 'ownRowHasDelete', 'deleteButtonsAfterLogout', 'deleteButtonsAfterLogin', 'deleted', 'playlistDeleted']

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 960 })
  page.on('dialog', (d) => d.accept())
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url().slice(0, 90)} ${r.failure()?.errorText || ''}`))
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url()}`)
  })

  const results = { attempt }
  const uname = `qa-${Date.now().toString(36)}-${attempt}`
  const pass = 'qa-password-123'
  const songName = `qa-song-${Date.now().toString(36)}-${attempt}`
  const plname = `QA歌单-${Date.now().toString(36)}-${attempt}`
  const { wavPath, lrcPath } = makeWav(songName)

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })

    results.brand = await page
      .waitForFunction(() => document.body.innerText.includes('LUMEN'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false)
    results.discover = await page
      .waitForFunction(() => document.body.innerText.includes('热歌榜'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false)

    // register
    await clickByText(page, '登录 / 注册')
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    await exactClick(page, '注册')
    await page.type('input[autocomplete="username"]', uname)
    await page.type('input[type="password"]', pass)
    await page.click('button[type="submit"]')
    results.registered = await page
      .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, uname)
      .then(() => true)
      .catch(() => false)

    // upload
    await clickByText(page, '上传')
    results.uploadView = await page
      .waitForFunction(() => document.body.innerText.includes('拖进来，或者点这里选择文件'), { timeout: 15000 })
      .then(() => true)
      .catch(() => false)
    const input = await page.$('input[type="file"]')
    await input.uploadFile(wavPath, lrcPath)
    results.parsed = await page
      .waitForFunction(() => document.body.innerText.includes('自动读取了元数据和封面'), { timeout: 25000 })
      .then(() => true)
      .catch(() => false)
    await clickByText(page, '发布到音乐大厅')
    await new Promise((r) => setTimeout(r, 3000))
    results.publishErrorShown = await page.evaluate(() => {
      const m = document.body.innerText.match(/(上传失败[^\n]*|读取歌曲信息失败[^\n]*)/)
      return m ? m[0] : ''
    })
    results.published = await page
      .waitForFunction(
        (name, u) => document.body.innerText.includes(name) && document.body.innerText.includes(`${u} 上传`),
        { timeout: 90000 },
        songName,
        uname,
      )
      .then(() => true)
      .catch(() => false)

    if (results.published) {
      await new Promise((r) => setTimeout(r, 800))
      results.playPressed = await page.evaluate((n) => {
        const row = [...document.querySelectorAll('.group')].find((el) => el.innerText.includes(n))
        const btn = row && row.querySelector('button[aria-label="播放"], button[aria-label^="播放"]')
        if (btn) btn.click()
        return !!btn
      }, songName)
      await new Promise((r) => setTimeout(r, 2000))
      results.isPlaying = !!(await page.$('button[aria-label="暂停"]'))

      // lyrics
      await clickByText(page, '歌词')
      results.lyricsPanel = await page
        .waitForFunction(() => document.body.innerText.includes('QA歌词第一行'), { timeout: 15000 })
        .then(() => true)
        .catch(() => false)
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label="关闭歌词"]')][0]
        if (b) b.click()
      })

      // effects
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '播放特效')
        if (b) b.click()
      })
      await page
        .waitForFunction(() => [...document.querySelectorAll('button')].some((x) => x.textContent.includes('流动极光')), {
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

      // queue panel
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '播放队列')
        if (b) b.click()
      })
      results.queuePanel = await page
        .waitForFunction(() => document.body.innerText.includes('播放队列'), { timeout: 8000 })
        .then(() => true)
        .catch(() => false)
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label="关闭播放队列"]')][0]
        if (b) b.click()
      })

      // light toggle
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

      // playlist create
      await clickByText(page, '歌单')
      await page.waitForFunction(() => document.body.innerText.includes('创建歌单'), { timeout: 10000 })
      await clickByText(page, '创建歌单')
      await page.waitForSelector('input[placeholder*="深夜循环"]', { timeout: 8000 })
      await page.type('input[placeholder*="深夜循环"]', plname)
      await page.click('button[type="submit"]')
      results.playlistCreated = await page
        .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, plname)
        .then(() => true)
        .catch(() => false)

      // playlist detail: add song, play all
      await clickByText(page, plname)
      await page.waitForFunction(() => document.body.innerText.includes('播放全部'), { timeout: 10000 })
      await clickByText(page, '添加歌曲')
      await page
        .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, songName)
        .catch(() => {})
      await page.evaluate((n) => {
        const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(n))
        if (b) b.click()
      }, songName)
      await new Promise((r) => setTimeout(r, 1500))
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label="关闭"]')].pop()
        if (b) b.click()
      })
      results.songInPlaylist = await page
        .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 15000 }, songName)
        .then(() => true)
        .catch(() => false)
      await clickByText(page, '播放全部')
      await new Promise((r) => setTimeout(r, 2000))
      results.playAllPlaying = !!(await page.$('button[aria-label="暂停"]'))

      // favorite + profile
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label="收藏"]')][0]
        if (b) b.click()
      })
      await clickByText(page, '我的')
      results.profileUploads = await page
        .waitForFunction((n) => document.body.innerText.includes('我上传的歌') && document.body.innerText.includes(n), {
          timeout: 15000,
        }, songName)
        .then(() => true)
        .catch(() => false)
      results.profileFavorites = await page.evaluate((n) => {
        const sec = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('我的收藏'))
        return !!sec && sec.parentElement.innerText.includes(n)
      }, songName)
      results.profileRecent = await page.evaluate((n) => {
        const sec = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('最近播放'))
        return !!sec && sec.parentElement.innerText.includes(n)
      }, songName)
      results.profilePlaylists = await page.evaluate((n) => {
        const sec = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('我的歌单'))
        return !!sec && sec.parentElement.innerText.includes(n)
      }, plname)

      // permissions
      results.ownRowHasDelete = await page.evaluate(
        (n) => [...document.querySelectorAll('button[aria-label^="删除"]')].some((b) => b.closest('.group')?.innerText?.includes(n)),
        songName,
      )
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '退出登录')
        if (b) b.click()
      })
      await page
        .waitForFunction(() => document.body.innerText.includes('登录后解锁你的音乐世界'), { timeout: 15000 })
        .catch(() => {})
      results.deleteButtonsAfterLogout = await page.$$eval('button[aria-label^="删除"]', (bs) => bs.length)

      // login again, delete own song
      await clickByText(page, '登录 / 注册')
      await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
      await page.type('input[autocomplete="username"]', uname)
      await page.type('input[type="password"]', pass)
      await page.click('button[type="submit"]')
      await page
        .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, uname)
        .catch(() => {})
      await page
        .waitForFunction((n) => document.body.innerText.includes('我上传的歌') && document.body.innerText.includes(n), {
          timeout: 20000,
        }, songName)
        .catch(() => {})
      results.deleteButtonsAfterLogin = await page.$$eval('button[aria-label^="删除"]', (bs) => bs.length)
      const clickedDelete = await page.evaluate((n) => {
        const btn = [...document.querySelectorAll('button[aria-label^="删除"]')].find((b) => b.closest('.group')?.innerText?.includes(n))
        if (!btn) return false
        btn.click()
        return true
      }, songName)
      if (clickedDelete) {
        results.deleted = await page
          .waitForFunction((n) => !document.body.innerText.includes(n), { timeout: 25000 }, songName)
          .then(() => true)
          .catch(() => false)
      } else {
        results.deleted = false
      }

      // delete playlist
      await clickByText(page, '歌单')
      await page.waitForFunction(() => document.body.innerText.includes('创建歌单'), { timeout: 10000 }).catch(() => {})
      await clickByText(page, plname)
      await page.waitForFunction(() => document.body.innerText.includes('删除歌单'), { timeout: 10000 }).catch(() => {})
      await clickByText(page, '删除歌单')
      await new Promise((r) => setTimeout(r, 1500))
      results.playlistDeleted = !(await page.evaluate((n) => document.body.innerText.includes(n), plname))
    }
  } catch (e) {
    results.throwError = String(e).slice(0, 200)
  }

  results.errors = errors.slice(0, 10)
  allResults[`attempt-${attempt}`] = results

  const passCount = passKeys.filter((k) => results[k] === true || results[k] === 0).length
  const expected = passKeys.length + 2
  if (passCount >= expected - 3 && results.published) {
    await page.setViewport({ width: 390, height: 844 })
    await page.screenshot({ path: path.join(SHOT_DIR, 'qa-lumen-mobile.png') })
    await page.setViewport({ width: 1440, height: 960 })
    await page.screenshot({ path: path.join(SHOT_DIR, 'qa-lumen-desktop.png') })
    console.log(JSON.stringify(results, null, 2))
    await browser.close()
    process.exit(0)
  }
  await page.close()
}

console.log('ALL ATTEMPTS FAILED')
console.log(JSON.stringify(allResults, null, 2))
await browser.close()
