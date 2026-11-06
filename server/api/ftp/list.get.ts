import { getConnection, listDir } from '../../utils/ftp'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id || '')
  const path = query.path ? String(query.path) : undefined
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  const conn = getConnection(id)
  try {
    const { path: cwd, items } = await listDir(conn, path)
    return {
      path: cwd,
      items,
    }
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'list failed' })
  }
})
