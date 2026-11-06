import { getConnection, removeConnection } from '../../utils/ftp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const id = String(body?.id || '')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  removeConnection(id)
  return { ok: true }
})
