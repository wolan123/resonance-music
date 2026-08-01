import { upload } from '@vercel/blob/client'

export async function uploadFileToBlob(file, kind = 'audio') {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    clientPayload: JSON.stringify({ kind }),
  })
  return blob.url
}
