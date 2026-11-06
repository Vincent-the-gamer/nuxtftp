import { getConnection, encodePath } from '../../utils/ftp'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unlink, readFile } from 'node:fs/promises'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const id = String(query.id || '')
  const remotePath = String(query.path || '')
  if (!id || !remotePath) throw createError({ statusCode: 400, statusMessage: 'id and path are required' })
  const conn = getConnection(id)
  const name = remotePath.split('/').pop() || 'download'
  const tempPath = join(tmpdir(), `ftp-download-${Date.now()}-${name}`)
  const rp = encodePath(remotePath, conn.encoding)
  try {
    await conn.client.downloadTo(tempPath, rp)
    const data = await readFile(tempPath)
    const range = getHeader(event, 'range')
    setHeader(event, 'Accept-Ranges', 'bytes')
    if (range) {
      const m = String(range).match(/bytes=(\d+)-(\d*)/)
      if (m) {
        const start = parseInt(m[1], 10)
        const end = m[2] ? parseInt(m[2], 10) : data.length - 1
        if (start >= data.length || start > end) {
          setResponseStatus(event, 416)
          setHeader(event, 'Content-Range', `bytes */${data.length}`)
          return
        }
        setResponseStatus(event, 206)
        setHeader(event, 'Content-Range', `bytes ${start}-${end}/${data.length}`)
        setHeader(event, 'Content-Length', String(end - start + 1))
        setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`)
        setHeader(event, 'Content-Type', 'application/octet-stream')
        return data.subarray(start, end + 1)
      }
    }
    setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(name)}"`)
    setHeader(event, 'Content-Type', 'application/octet-stream')
    setHeader(event, 'Content-Length', String(data.length))
    return data
  } catch (err: any) {
    throw createError({ statusCode: 502, statusMessage: err?.message || 'download failed' })
  } finally {
    setTimeout(() => { unlink(tempPath).catch(() => {}) }, 1000)
  }
})
