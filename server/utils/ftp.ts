import { Client } from 'basic-ftp'
import { randomUUID } from 'node:crypto'
import * as iconv from 'iconv-lite'

export type FtpEncoding = 'utf8' | 'gbk'

export interface FtpConnection {
  id: string
  client: Client
  host: string
  port: number
  user: string
  secure: boolean
  encoding: FtpEncoding
  cwd: string
}

const connections = new Map<string, FtpConnection>()

export function decodeName(name: string, encoding: FtpEncoding): string {
  if (encoding !== 'gbk') return name
  try {
    return iconv.decode(Buffer.from(name, 'latin1'), 'gbk')
  } catch {
    return name
  }
}

export function encodePath(path: string, encoding: FtpEncoding): string {
  if (encoding !== 'gbk') return path
  try {
    return iconv.encode(path, 'gbk').toString('latin1')
  } catch {
    return path
  }
}

export function createFtpConnection(opts: {
  host: string
  port: number
  user: string
  password: string
  secure: boolean
  encoding: FtpEncoding
}): FtpConnection {
  const client = new Client(30000)
  const conn: FtpConnection = {
    id: randomUUID(),
    client,
    host: opts.host,
    port: opts.port,
    user: opts.user,
    secure: opts.secure,
    encoding: opts.encoding || 'utf8',
    cwd: '/',
  }
  connections.set(conn.id, conn)
  ;(conn as any)._password = opts.password
  return conn
}

export function getConnection(id: string): FtpConnection {
  const conn = connections.get(id)
  if (!conn) throw new Error('Unknown or closed connection')
  if (conn.client.closed) {
    connections.delete(id)
    throw new Error('Connection closed')
  }
  return conn
}

export function removeConnection(id: string) {
  const conn = connections.get(id)
  if (conn) {
    try { conn.client.close() } catch {}
    connections.delete(id)
  }
}

export async function connectClient(conn: FtpConnection, password: string) {
  conn.client.ftp.encoding = conn.encoding === 'gbk' ? 'latin1' : 'utf8'
  await conn.client.access({
    host: conn.host,
    port: conn.port,
    user: conn.user,
    password,
    secure: conn.secure,
  })
  const rawCwd = await conn.client.pwd()
  conn.cwd = decodeName(rawCwd, conn.encoding)
}

export async function listDir(conn: FtpConnection, path?: string) {
  const target = path ? encodePath(path, conn.encoding) : undefined
  const rawItems = await conn.client.list(target)

  let rawCwd: string
  if (path) {
    rawCwd = path
    // enter the directory so relative probes (size/cd) work for its children
    try { await conn.client.cd(target as string) } catch {}
  } else {
    try { rawCwd = await conn.client.pwd() } catch { rawCwd = conn.cwd }
  }
  if (path) {
    conn.cwd = path
  } else {
    conn.cwd = decodeName(rawCwd, conn.encoding)
  }

  const enriched: any[] = []
  for (const item of rawItems) {
    const rawName = item.name
    let type = 'other'
    let size = item.size ?? 0
    let modified = item.modifiedAt ? item.modifiedAt.toISOString() : null

    if (item.type === 2) type = 'dir'
    else if (item.type === 1) type = 'file'
    else {
      try {
        size = await conn.client.size(rawName)
        type = 'file'
      } catch {
        try {
          await conn.client.cd(rawName)
          type = 'dir'
          await conn.client.cdup()
        } catch {
          type = 'other'
        }
      }
    }

    if (type === 'file' && (!size || size === 0)) {
      try { size = await conn.client.size(rawName) } catch {}
    }

    if (!modified) {
      try {
        const d = await conn.client.lastMod(rawName)
        modified = d.toISOString()
      } catch {}
    }

    enriched.push({
      name: decodeName(rawName, conn.encoding),
      type,
      size: size ?? 0,
      modified,
      permissions: item.permissions?.permission ?? null,
      isSymlink: item.isSymlink ?? false,
    })
  }

  return { path: conn.cwd, items: enriched }
}

export function toFileInfo(item: any, encoding: FtpEncoding) {
  return {
    name: decodeName(item.name, encoding),
    type: item.type === 2 ? 'dir' : item.type === 1 ? 'file' : 'other',
    size: item.size ?? 0,
    modified: item.modifiedAt ? item.modifiedAt.toISOString() : null,
    permissions: item.permissions?.permission ?? null,
    isSymlink: item.isSymlink ?? false,
  }
}
