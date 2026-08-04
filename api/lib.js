import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { del, get, put, list } from '@vercel/blob'

const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-only-secret'
const ENC_KEY = scryptSync(AUTH_SECRET, 'lumen-auth-v1', 32)
const USER_PREFIX = 'users/'
const SESSION_PREFIX = 'users/sessions/'
const SONG_PREFIX = 'songs/'
const PLAYLIST_PREFIX = 'playlists/'
const CLOUD_PREFIX = 'cloud/'
const SESSION_TTL = 30 * 24 * 3600 * 1000

export function parseCookies(req) {
  const header = req?.headers?.cookie || req?.headers?.Cookie || ''
  const out = {}
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=')
    if (i > 0) {
      const key = part.slice(0, i).trim()
      try {
        out[key] = decodeURIComponent(part.slice(i + 1).trim())
      } catch {
        out[key] = part.slice(i + 1).trim()
      }
    }
  }
  return out
}

export function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `lumen_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL / 1000)}; Secure`,
  )
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'lumen_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure')
}

export function isAdminUser(user) {
  const admins = String(process.env.ADMIN_USERNAMES || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  return !!user && admins.includes(String(user.username || '').toLowerCase())
}

export function hashPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex')
}

export function verifyPassword(password, salt, expectedHex) {
  const a = Buffer.from(hashPassword(password, salt), 'hex')
  const b = Buffer.from(String(expectedHex || ''), 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

function encrypt(text) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', ENC_KEY, iv)
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

function decrypt(b64) {
  const buf = Buffer.from(b64, 'base64')
  const iv = buf.subarray(0, 12)
  const tag = buf.subarray(12, 28)
  const data = buf.subarray(28)
  const decipher = createDecipheriv('aes-256-gcm', ENC_KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

async function readBlobText(pathname) {
  const result = await get(pathname, { access: 'public', useCache: false })
  if (!result || result.statusCode !== 200 || !result.stream) return null
  return new Response(result.stream).text()
}

async function writeBlob(pathname, body, contentType) {
  await put(pathname, body, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  })
}

export async function readUserFile(pathname) {
  const text = await readBlobText(pathname)
  if (!text) return null
  try {
    return JSON.parse(decrypt(text))
  } catch {
    return null
  }
}

export async function writeUserFile(pathname, obj) {
  await writeBlob(pathname, encrypt(JSON.stringify(obj)), 'application/octet-stream')
}

export async function findByUsername(username) {
  const { blobs } = await list({ prefix: USER_PREFIX })
  const files = blobs
    .filter(
      (b) =>
        b.pathname.startsWith(USER_PREFIX) &&
        b.pathname.endsWith('.json') &&
        !b.pathname.startsWith(SESSION_PREFIX),
    )
    .map((b) => b.pathname)
  const needle = String(username || '').toLowerCase()
  for (const file of files) {
    const user = await readUserFile(file)
    if (user && String(user.username || '').toLowerCase() === needle) return user
  }
  return null
}

export async function createSession(userId) {
  const token = randomBytes(32).toString('hex')
  const digest = createHmac('sha256', AUTH_SECRET).update(token).digest('hex')
  await writeBlob(
    `${SESSION_PREFIX}${digest}.json`,
    JSON.stringify({ userId, expiresAt: Date.now() + SESSION_TTL }),
    'application/json',
  )
  return token
}

export async function destroySession(req) {
  const token = parseCookies(req).lumen_session
  if (!token) return
  const digest = createHmac('sha256', AUTH_SECRET).update(token).digest('hex')
  try {
    await del(`${SESSION_PREFIX}${digest}.json`)
  } catch {
    /* ignore */
  }
}

export async function getSessionUser(req) {
  const token = parseCookies(req).lumen_session
  if (!token) return null
  const digest = createHmac('sha256', AUTH_SECRET).update(token).digest('hex')
  const text = await readBlobText(`${SESSION_PREFIX}${digest}.json`)
  if (!text) return null
  let session
  try {
    session = JSON.parse(text)
  } catch {
    return null
  }
  if (!session.userId || session.expiresAt < Date.now()) return null
  return readUserFile(`${USER_PREFIX}${session.userId}.json`)
}

export async function readSongFile(pathname) {
  const text = await readBlobText(pathname)
  if (!text) return null
  try {
    const data = JSON.parse(text)
    return data && typeof data === 'object' && data.id ? data : null
  } catch {
    return null
  }
}

export async function writeSongFile(song) {
  await writeBlob(`${SONG_PREFIX}${song.id}.json`, JSON.stringify(song), 'application/json')
}

export async function readAllSongs() {
  const { blobs } = await list({ prefix: SONG_PREFIX })
  const files = blobs
    .filter((b) => b.pathname.startsWith(SONG_PREFIX) && b.pathname.endsWith('.json'))
    .map((b) => b.pathname)
  const songs = (await Promise.all(files.map(readSongFile))).filter(Boolean)
  return songs.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0))
}

export async function readPlaylistFile(pathname) {
  const text = await readBlobText(pathname)
  if (!text) return null
  try {
    const data = JSON.parse(text)
    return data && typeof data === 'object' && data.id ? data : null
  } catch {
    return null
  }
}

export async function writePlaylistFile(playlist) {
  await writeBlob(`${PLAYLIST_PREFIX}${playlist.id}.json`, JSON.stringify(playlist), 'application/json')
}

export async function readCloudCreds() {
  const text = await readBlobText(`${CLOUD_PREFIX}creds.json`)
  if (!text) return null
  try {
    const data = JSON.parse(decrypt(text))
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

export async function writeCloudCreds(creds) {
  await writeBlob(`${CLOUD_PREFIX}creds.json`, encrypt(JSON.stringify(creds || {})), 'application/octet-stream')
}

export async function readAllPlaylists() {
  const { blobs } = await list({ prefix: PLAYLIST_PREFIX })
  const files = blobs
    .filter((b) => b.pathname.startsWith(PLAYLIST_PREFIX) && b.pathname.endsWith('.json'))
    .map((b) => b.pathname)
  const playlists = (await Promise.all(files.map(readPlaylistFile))).filter(Boolean)
  return playlists.sort((a, b) => (b.playCount || 0) - (a.playCount || 0) || (b.createdAt || 0) - (a.createdAt || 0))
}

export function cleanString(value, max) {
  return String(value || '').trim().slice(0, max)
}
