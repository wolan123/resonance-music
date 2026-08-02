import { cleanString, readSongFile, writeSongFile } from './lib.js'

export default async function handler(req, res) {
  const body = req.body || {}
  const id = cleanString(body.id, 100)
  if (!id) return res.status(400).json({ error: '缺少歌曲 ID' })
  try {
    const song = await readSongFile(`songs/${id}.json`)
    if (!song) return res.status(404).json({ error: '歌曲不存在' })
    song.playCount = (song.playCount || 0) + 1
    await writeSongFile(song)
    return res.status(200).json({ ok: true, playCount: song.playCount })
  } catch (e) {
    return res.status(500).json({ error: e.message || '服务出错' })
  }
}
