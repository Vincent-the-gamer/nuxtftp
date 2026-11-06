import { getConnection, encodePath } from '../../utils/ftp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = String(body?.id || '')
  const path = String(body?.path || '').trim()
  const type = String(body?.type || 'file')
  if (!id || !path) throw createError({ statusCode: 400, statusMessage: 'id and path are required' })
  const conn = getConnection(id)
  try {
    const rp = encodePath(path, conn.encoding)
    if (type === 'dir') {
      await conn.client.removeDir(rp)
    } else {
      await conn.client.remove(rp)
    }
    return { ok: true }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'remove failed' })
  }
})
