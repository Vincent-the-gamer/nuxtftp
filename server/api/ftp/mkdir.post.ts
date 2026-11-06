import { getConnection, encodePath } from '../../utils/ftp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = String(body?.id || '')
  const path = String(body?.path || '').trim()
  if (!id || !path) throw createError({ statusCode: 400, statusMessage: 'id and path are required' })
  const conn = getConnection(id)
  try {
    await conn.client.makeDir(encodePath(path, conn.encoding))
    return { ok: true }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'mkdir failed' })
  }
})
