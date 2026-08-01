import { randomUUID } from 'node:crypto'
import {
  cleanString,
  clearSessionCookie,
  createSession,
  destroySession,
  findByUsername,
  getSessionUser,
  hashPassword,
  setSessionCookie,
  verifyPassword,
  writeUserFile,
} from './lib.js'

function publicUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt }
}

export default async function handler(req, res) {
  const body = req.body || {}
  const action = String(body.action || '')

  try {
    if (action === 'register') {
      const username = cleanString(body.username, 24)
      const password = String(body.password || '')
      if (!/^[\w\u4e00-\u9fa5-]{2,20}$/.test(username)) {
        return res.status(400).json({ error: '用户名需为 2-20 位字母、数字、中文或下划线' })
      }
      if (password.length < 6 || password.length > 72) {
        return res.status(400).json({ error: '密码需为 6-72 位' })
      }
      const existing = await findByUsername(username)
      if (existing) return res.status(409).json({ error: '这个用户名已经被占用了' })
      const salt = randomUUID().replace(/-/g, '')
      const user = {
        id: randomUUID(),
        username,
        salt,
        passwordHash: hashPassword(password, salt),
        createdAt: Date.now(),
      }
      await writeUserFile(`users/${user.id}.json`, user)
      const token = await createSession(user.id)
      setSessionCookie(res, token)
      return res.status(200).json({ user: publicUser(user) })
    }

    if (action === 'login') {
      const username = cleanString(body.username, 24)
      const password = String(body.password || '')
      if (!username || !password) return res.status(400).json({ error: '请输入用户名和密码' })
      const user = await findByUsername(username)
      if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
        return res.status(401).json({ error: '用户名或密码不正确' })
      }
      const token = await createSession(user.id)
      setSessionCookie(res, token)
      return res.status(200).json({ user: publicUser(user) })
    }

    if (action === 'logout') {
      await destroySession(req)
      clearSessionCookie(res)
      return res.status(200).json({ ok: true })
    }

    if (action === 'me') {
      const user = await getSessionUser(req)
      return res.status(200).json({ user: user ? publicUser(user) : null })
    }

    return res.status(400).json({ error: '未知操作' })
  } catch (e) {
    return res.status(500).json({ error: e.message || '服务出错' })
  }
}
