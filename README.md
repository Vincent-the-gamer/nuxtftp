# nuxtftp

A web-based FTP client. The UI is a single-page Nuxt 4 + Vue 3 app, and the actual FTP sessions are opened and held by the Nitro server through [`basic-ftp`](https://github.com/patrickjuchli/basic-ftp) — the browser never directly connect FTP.

English | [简体中文](README.zh_cn.md)

## Features

- **Saved connections**: host, port, user, password, FTPS and filename encoding kept in `localStorage`, editable and deletable at any time.
- **FTPS**: explicit TLS (`AUTH TLS`) when enabled.
- **GBK filenames**: for older servers that still use GBK — paths and filenames are converted with iconv on the server.
- **File browsing**: breadcrumb navigation, refresh, new folder, rename, delete.
- **Upload**: pick files or drop them anywhere on the page; files go up one by one with progress.
- **Download**: streamed on the client with progress; the server implements `Range` responses for resumable transfers from scripts (the UI downloads in one piece).
- **Bilingual UI**: English and Chinese, toggled in the header, choice kept in `localStorage`.

## Quick start

Requires Node 22.22+ (Nuxt 4's engine range).

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>. The dev server binds `0.0.0.0`, so other devices on your LAN can reach it too.

## Usage

1. Click **New connection** and fill in host, port, user and password.
2. Tick **Use FTPS (TLS)** for servers that require explicit TLS. Self-signed certificates are currently rejected by Node's TLS validation.
3. If filenames come back garbled, switch **Filename encoding** from `utf8` to `gbk`.
4. Save, then click **Connect**. The current session lives in `sessionStorage`, so a page refresh reconnects automatically.

## Connections are server-process state

This is the one thing to understand about the project: `connect` creates a `basic-ftp` client inside the Nitro process, stores it in an in-process `Map`, and returns a UUID. Every later request finds the connection through that id (see `server/utils/ftp.ts`).

Three consequences follow:

- **A restart drops every session**: dev hot reload or a server restart wipes the `Map`; the client retries with the config in `sessionStorage`, password included.
- **Single instance only**: with more than one replica, requests must be sticky to the instance that opened the connection. Going stateless means moving connection state out of the process.
- **No idle reaping**: connections are not cleaned up after sitting idle; they leave the registry on **Disconnect** only. A dead connection is dropped lazily on the next request that touches it.

## Project layout

```
app/
  app.vue                 global shell: animated background, spotlight
  pages/index.vue         connection screen + file manager (all UI state lives here)
  composables/useI18n.ts  English and Chinese dictionaries, locale toggle
  assets/main.css         global styles and design tokens
server/
  utils/ftp.ts            connection registry, directory listing, encoding conversion
  api/ftp/*               HTTP endpoints
```

`listDir` fills in type, size and modification time per entry: it uses the `MLSD` fields when present, then falls back to `SIZE`, a `CWD`/`CDUP` probe to detect directories, and `MDTM`. A slow listing usually means the server has no `MLSD`.

## HTTP API

| Method | Path | Parameters | Description |
| --- | --- | --- | --- |
| `POST` | `/api/ftp/connect` | `host, port?, user?, password?, secure?, encoding?` | Open a connection; returns `id` and the initial `cwd` |
| `POST` | `/api/ftp/disconnect` | `id` | Close and remove the connection |
| `GET` | `/api/ftp/list` | `id, path?` | List a directory; returns `path` and `items` |
| `POST` | `/api/ftp/mkdir` | `id, path` | Create a directory |
| `POST` | `/api/ftp/remove` | `id, path, type` | Delete; `type=dir` uses `removeDir` |
| `POST` | `/api/ftp/rename` | `id, from, to` | Rename or move |
| `POST` | `/api/ftp/upload` | multipart: `id, path, file` | Upload one file |
| `GET` | `/api/ftp/download` | `id, path` | Download; supports `Range` |

Missing parameters return `400`; failed FTP operations return `502` with the underlying FTP error in `statusMessage`.

## Deployment

```bash
pnpm build
node .output/server/index.mjs
```

The `start` script in `package.json` is written as `set HOST=0.0.0.0&&node ...`, which only works on Windows. On macOS and Linux use `HOST=0.0.0.0 node .output/server/index.mjs`.

## Security notes

- **The server opens FTP connections on behalf of visitors**, to any address including internal ones. Deploy it in a trusted environment or put authentication in front of it.
- **Saved passwords sit in the browser's `localStorage` in plain text.**
- **Uploads and downloads both go through server-side temp files** (`os.tmpdir()`): uploads land on disk before being forwarded, downloads are read into memory whole before being returned. Large files cost both temp disk space and server memory.

## License

[MIT](LICENSE)
