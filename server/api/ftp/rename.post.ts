import { getConnection, encodePath } from '../../utils/ftp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = String(body?.id || '')
  const from = String(body?.from || '').trim()
  const to = String(body?.to || '').trim()
  if (!id || !from || !to) throw createError({ statusCode: 400, statusMessage: 'id, from, to are required' })
  const conn = getConnection(id)
  try {
    await conn.client.rename(encodePath(from, conn.encoding), encodePath(to, conn.encoding))
    return { ok: true }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'rename failed' })
  }
})
