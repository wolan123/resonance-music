import { handleUpload } from '@vercel/blob/client'

export default async function handler(req, res) {
  const body = req.body || {}
  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let kind = 'audio'
        try {
          kind = JSON.parse(clientPayload || '{}').kind || 'audio'
        } catch {
          /* ignore */
        }
        return {
          allowedContentTypes:
            kind === 'image'
              ? ['image/jpeg', 'image/png', 'image/webp', 'image/*']
              : ['audio/*', 'application/octet-stream', 'video/*'],
          addRandomSuffix: true,
        }
      },
    })
    res.status(200).json(jsonResponse)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}
