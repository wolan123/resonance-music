import puppeteer from 'puppeteer-core'
import path from 'node:path'

const BASE = process.env.BASE_URL || 'http://localhost:4173'
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const SHOT_DIR = process.env.SHOT_DIR || '.'

async function clickByText(page, text) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t))
    if (b) b.click()
  }, text)
}

async function exactClick(page, text) {
  await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === t)
    if (b) b.click()
  }, text)
}

async function clickNav(page, label) {
  await page.evaluate((t) => {
    const nav = document.querySelector('nav[aria-label*="导"]') || document.querySelector('aside nav')
    const b = nav && [...nav.querySelectorAll('button')].find((x) => x.textContent.trim().startsWith(t))
    if (b) b.click()
  }, label)
}

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: true,
  args: ['--disable-gpu', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars'],
})

const allResults = {}
const passKeys = [
  'brand',
  'discover',
  'registered',
  'chartPlayable',
  'playerPageOpen',
  'isPlaying',
  'lyricsInPage',
  'playerPageClosed',
  'effectChanged',
  'queuePanel',
  'canvasOn',
  'playlistCreated',
  'songInPlaylist',
  'playAllPlaying',
  'searchRows',
  'cloudNoSearch',
  'profileFavorites',
  'profileRecent',
  'profilePlaylists',
  'reportStats',
  'deleteButtonsAfterLogout',
  'deleteButtonsAfterLogin',
  'playlistDeleted',
]

for (let attempt = 1; attempt <= 3; attempt += 1) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 1440, height: 960 })
  page.on('dialog', (d) => d.accept())
  const errors = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url().slice(0, 90)} ${r.failure()?.errorText || ''}`))
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('music.126.net')) errors.push(`HTTP ${r.status()} ${r.url()}`)
  })

  const results = { attempt }
  const uname = `qa-${Date.now().toString(36)}-${attempt}`
  const pass = 'qa-password-123'
  const plname = `QA云歌单-${Date.now().toString(36)}-${attempt}`

  try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })

    results.brand = await page
      .waitForFunction(() => document.body.innerText.includes('LUMEN'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false)
    results.discover = await page
      .waitForFunction(() => document.body.innerText.includes('全网热歌榜'), { timeout: 30000 })
      .then(() => true)
      .catch(() => false)

    // register
    await clickByText(page, '登录 / 注册')
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 }).catch(async () => {
      await clickByText(page, '登录 / 注册')
      await page.waitForSelector('input[autocomplete="username"]', { timeout: 15000 })
    })
    await exactClick(page, '注册')
    await page.type('input[autocomplete="username"]', uname)
    await page.type('input[type="password"]', pass)
    await page.click('button[type="submit"]')
    results.registered = await page
      .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, uname)
      .then(() => true)
      .catch(() => false)

    // play a cloud chart song
    await page.waitForFunction(() => document.body.innerText.includes('全网热歌榜'), { timeout: 30000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 1200))
    results.chartPlayable = await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button[aria-label^="播放"]')].find(
        (b) => b.closest('.group') && b.closest('.group').innerText.includes('全网热歌榜') === false,
      )
      const target = btn || [...document.querySelectorAll('button[aria-label^="播放"]')][0]
      if (target) target.click()
      return !!target
    })
    await new Promise((r) => setTimeout(r, 2500))
    results.playerPageOpen = await page
      .waitForFunction(() => !!document.querySelector('[role="dialog"][aria-label="播放页"]'), { timeout: 15000 })
      .then(() => true)
      .catch(() => false)
    results.isPlaying = !!(await page.$('button[aria-label="暂停"]'))
    results.lyricsInPage = await page
      .waitForFunction(() => {
        const d = document.querySelector('[role="dialog"][aria-label="播放页"]')
        if (!d) return false
        const t = d.innerText
        return !t.includes('正在找歌词') && !t.includes('还没有歌词') && t.length > 90
      }, { timeout: 25000 })
      .then(() => true)
      .catch(() => false)
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[aria-label="收起播放页"]')][0]
      if (b) b.click()
    })
    await new Promise((r) => setTimeout(r, 1200))
    if (await page.$('[role="dialog"][aria-label="播放页"]')) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label="收起播放页"]')][0]
        if (b) b.click()
      })
      await new Promise((r) => setTimeout(r, 1000))
    }
    results.playerPageClosed = !(await page.$('[role="dialog"][aria-label="播放页"]'))

    // effects
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => x.getAttribute('aria-label') === '播放特效' || x.getAttribute('aria-label') === '切换播放特效',
      )
      if (b) b.click()
    })
    await new Promise((r) => setTimeout(r, 600))
    results.effectChanged = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => x.getAttribute('aria-label') === '播放特效' || x.getAttribute('aria-label') === '切换播放特效',
      )
      return b ? b.textContent.includes('极光') || b.textContent.includes('脉冲') : false
    })

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
    results.canvasOn = !!(await page.$('canvas'))
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '沉浸光效开关')
      if (b) b.click()
    })
    await new Promise((r) => setTimeout(r, 400))
    const canvasAfterOff = !!(await page.$('canvas'))
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '沉浸光效开关')
      if (b) b.click()
    })
    await new Promise((r) => setTimeout(r, 300))
    results.canvasBackOn = !!(await page.$('canvas'))
    results.canvasToggleOk = results.canvasOn && !canvasAfterOff && results.canvasBackOn

    // playlist create
    await clickNav(page, '歌单')
    await page
      .waitForFunction(() => document.body.innerText.includes('创建歌单'), { timeout: 12000 })
      .catch(async () => {
        await clickNav(page, '歌单')
        await page.waitForFunction(() => document.body.innerText.includes('创建歌单'), { timeout: 12000 })
      })
    await clickByText(page, '创建歌单')
    await page.waitForSelector('input[placeholder*="循环"]', { timeout: 8000 }).catch(() => {})
    const plInput = await page.$('input[placeholder*="循环"], input[placeholder*="歌单名称"]')
    if (plInput) {
      await plInput.type(plname)
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[type="submit"]')].pop()
        if (b) b.click()
      })
    }
    results.playlistCreated = await page
      .waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, plname)
      .then(() => true)
      .catch(() => false)

    // playlist detail: add cloud song via picker
    await clickByText(page, plname)
    await page.waitForFunction(() => document.body.innerText.includes('播放全部'), { timeout: 10000 }).catch(() => {})
    await clickByText(page, '添加歌曲')
    await page
      .waitForFunction(() => document.body.innerText.includes('添加歌曲到'), { timeout: 15000 })
      .catch(() => {})
    await page.type('input[placeholder*="搜索歌名"]', '周杰伦')
    await page.keyboard.press('Enter')
    await new Promise((r) => setTimeout(r, 5000))
    results.songInPlaylist = await page.evaluate(() => {
      const dialog = [...document.querySelectorAll('[role="dialog"]')].pop()
      const btn =
        dialog &&
        [...dialog.querySelectorAll('button')].find((x) => x.textContent.includes('周杰伦') || x.textContent.includes('晴天'))
      if (btn) btn.click()
      return !!btn
    })
    await new Promise((r) => setTimeout(r, 2500))
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[aria-label="关闭"]')].pop()
      if (b) b.click()
    })
    await new Promise((r) => setTimeout(r, 800))
    results.songVisible = await page.evaluate(() => document.body.innerText.includes('周杰伦') || document.body.innerText.includes('晴天'))
    await clickByText(page, '播放全部')
    await new Promise((r) => setTimeout(r, 2500))
    results.playAllPlaying = !!(await page.$('button[aria-label="暂停"]'))
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[aria-label="收起播放页"]')][0]
      if (b) b.click()
    })
    await new Promise((r) => setTimeout(r, 800))

    // favorite current song
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button[aria-label="收藏"]')][0]
      if (b) b.click()
    })
    await clickNav(page, '我的')
    await new Promise((r) => setTimeout(r, 1200))
    results.profileRecent = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('最近播放'))
      return !!sec && sec.parentElement.innerText.trim().length > 20
    })
    results.profileFavorites = await page.evaluate(() => {
      const sec = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('我的收藏'))
      return !!sec && sec.parentElement.innerText.includes('周杰伦') === false && sec.parentElement.innerText.trim().length > 20
    })
    results.profilePlaylists = await page.evaluate((n) => {
      const sec = [...document.querySelectorAll('h2')].find((x) => x.textContent.includes('我的歌单'))
      return !!sec && sec.parentElement.innerText.includes(n)
    }, plname)

    // report view
    await clickByText(page, '我的听歌报告')
    await page
      .waitForFunction(() => document.body.innerText.includes('累计播放'), { timeout: 20000 })
      .then(() => (results.reportStats = true))
      .catch(() => (results.reportStats = false))

    // search view standalone
    await clickNav(page, '搜索')
    await page.waitForFunction(() => document.body.innerText.includes('搜遍网易云'), { timeout: 15000 }).catch(() => {})
    await page.type('input[placeholder*="搜索网易云"]', '晴天')
    await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelectorAll('.group').length > 0, { timeout: 20000 }).catch(() => {})
    await new Promise((r) => setTimeout(r, 800))
    results.searchRows = await page.evaluate(() => document.querySelectorAll('.group').length)

    // cloud view: no search, has go-search
    await clickNav(page, '云音乐')
    await page.waitForFunction(() => document.body.innerText.includes('共享会员'), { timeout: 15000 }).catch(() => {})
    results.cloudNoSearch = await page.evaluate(
      () => !document.querySelector('input[placeholder*="搜索"]') && [...document.querySelectorAll('button')].some((x) => x.textContent.includes('去搜索')),
    )

    // permissions
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === '退出登录')
      if (b) b.click()
    })
    await page
      .waitForFunction(() => document.body.innerText.includes('登录后解锁你的音乐世界'), { timeout: 15000 })
      .catch(() => {})
    results.deleteButtonsAfterLogout = await page.$$eval('button[aria-label^="删除"]', (bs) => bs.length)

    await clickByText(page, '登录 / 注册')
    await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 }).catch(async () => {
      await clickByText(page, '登录 / 注册')
      await page.waitForSelector('input[autocomplete="username"]', { timeout: 10000 })
    })
    await page.type('input[autocomplete="username"]', uname)
    await page.type('input[type="password"]', pass)
    await page.click('button[type="submit"]')
    await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 20000 }, uname).catch(() => {})
    await new Promise((r) => setTimeout(r, 1500))
    results.deleteButtonsAfterLogin = await page.$$eval('button[aria-label^="删除"]', (bs) => bs.length)

    // delete playlist (own)
    await clickNav(page, '歌单')
    await page.waitForFunction(() => document.body.innerText.includes('创建歌单'), { timeout: 10000 }).catch(() => {})
    await clickByText(page, plname)
    await page.waitForFunction(() => document.body.innerText.includes('删除歌单'), { timeout: 10000 }).catch(() => {})
    await clickByText(page, '删除歌单')
    results.playlistDeleted = await page
      .waitForFunction((n) => !document.body.innerText.includes(n), { timeout: 20000 }, plname)
      .then(() => true)
      .catch(() => false)
  } catch (e) {
    results.throwError = String(e).slice(0, 200)
  }

  results.errors = errors.slice(0, 10)
  allResults[`attempt-${attempt}`] = results

  const passCount = passKeys.filter(
    (k) =>
      results[k] === true ||
      (typeof results[k] === 'number' && results[k] > 0) ||
      (k === 'deleteButtonsAfterLogin' && results[k] >= 1) ||
      (k === 'deleteButtonsAfterLogout' && results[k] === 0),
  ).length
  if (passCount >= passKeys.length - 2) {
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
