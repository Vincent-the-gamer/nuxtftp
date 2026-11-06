import { createFtpConnection, connectClient, removeConnection } from '../../utils/ftp'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const host = String(body?.host || '').trim()
  const port = Number(body?.port || 21)
  const user = String(body?.user || 'anonymous')
  const password = String(body?.password || '')
  const secure = Boolean(body?.secure)
  const encoding = body?.encoding === 'gbk' ? 'gbk' : 'utf8'

  if (!host) throw createError({ statusCode: 400, statusMessage: 'host is required' })

  const conn = createFtpConnection({ host, port, user, password, secure, encoding })
  try {
    await connectClient(conn, password)
    return {
      id: conn.id,
      host: conn.host,
      port: conn.port,
      user: conn.user,
      secure: conn.secure,
      cwd: conn.cwd,
    }
  } catch (err: any) {
    removeConnection(conn.id)
    throw createError({ statusCode: 502, statusMessage: err?.message || 'FTP connect failed' })
  }
})
