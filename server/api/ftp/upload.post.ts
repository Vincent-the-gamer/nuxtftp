import { getConnection, encodePath } from '../../utils/ftp'
import { writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'multipart required' })
  const idPart = parts.find(p => p.name === 'id')
  const pathPart = parts.find(p => p.name === 'path')
  const filePart = parts.find(p => p.name === 'file')
  const id = idPart ? idPart.data.toString() : ''
  const remoteDir = pathPart ? pathPart.data.toString() : ''
  if (!id || !filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'id and file are required' })
  }
  const conn = getConnection(id)
  const tempPath = join(tmpdir(), `ftp-upload-${Date.now()}-${filePart.filename}`)
  await writeFile(tempPath, filePart.data)
  const remotePath = encodePath(
    remoteDir
      ? `${remoteDir.replace(/\/$/, '')}/${filePart.filename}`
      : filePart.filename,
    conn.encoding
  )
  try {
    await conn.client.uploadFrom(tempPath, remotePath)
    return { ok: true, name: filePart.filename, path: remotePath }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'upload failed' })
  } finally {
    await unlink(tempPath).catch(() => {})
  }
})
