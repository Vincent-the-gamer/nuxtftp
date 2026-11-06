# nuxtftp

一个跑在浏览器里的 FTP 客户端。界面是 Nuxt 4 + Vue 3 的单页应用（标题处显示为「FTP 客户端」），真正的 FTP 会话由 Nitro 服务端通过 [`basic-ftp`](https://github.com/patrickjuchli/basic-ftp) 建立并持有——浏览器不直接说 FTP。

[English](README.md) | 简体中文

## 功能

- **多连接管理**：主机、端口、用户名、密码、FTPS、文件名编码存进 `localStorage`，随时编辑或删除。
- **FTPS**：勾选后走显式 TLS（`AUTH TLS`）。
- **GBK 文件名**：面向仍在用 GBK 的旧服务器，路径与文件名在服务端做 iconv 转换。
- **文件浏览**：面包屑导航、刷新、新建文件夹、重命名、删除。
- **上传**：选择文件，或把文件拖到页面任意位置；逐个上传并显示进度。
- **下载**：浏览器端流式读取并显示进度；服务端实现了 `Range` 响应，可供脚本断点续传（界面目前整段下载）。
- **中英双语界面**：顶部切换，选择记在 `localStorage`。

## 快速开始

需要 Node 22.22+（Nuxt 4 的 engines 要求）。

```bash
pnpm install
pnpm dev
```

打开 <http://localhost:3000>。开发服务器监听 `0.0.0.0`，局域网内其他设备也能访问。

## 使用

1. 点「新建连接」，填入主机、端口、用户名、密码。
2. 目标服务器要求显式 TLS 的 FTPS 时，勾选「使用 FTPS (TLS)」。自签名证书目前会被 Node 的 TLS 校验拒绝。
3. 文件名出现乱码时，把「文件名编码」从 `utf8` 换成 `gbk`。
4. 保存后点「连接」。当前会话存在 `sessionStorage`，刷新页面会自动重连。

## 连接是服务端进程内的状态

这是理解本项目最关键的一点：`connect` 会在 Nitro 进程里创建一个 `basic-ftp` 客户端，放进进程内的 `Map`，返回一个 UUID；之后每个请求都靠这个 id 找到连接（见 `server/utils/ftp.ts`）。

由此带来三个后果：

- **重启即断线**：dev 热重载或服务重启会清空 `Map`，前端会用 `sessionStorage` 里的配置尝试自动重连，密码也随之重新提交。
- **只适合单实例**：多副本部署时，请求必须粘性路由到创建连接的那个实例。要无状态横向扩展，就得把连接状态下移出进程。
- **没有空闲回收**：连接不会因为长时间空闲被主动清理，只有「断开」才会离开注册表；失效的连接在下一次访问到它时被惰性清除。

## 目录结构

```
app/
  app.vue                 全局外壳：动态背景、聚光效果
  pages/index.vue         连接页 + 文件管理页（全部界面状态都在这里）
  composables/useI18n.ts  中英文词典与语言切换
  assets/main.css         全局样式与设计变量
server/
  utils/ftp.ts            连接注册表、目录枚举、编码转换
  api/ftp/*               对外的 HTTP 接口
```

`listDir` 会为每条目录项补全类型、大小和修改时间：优先用 `MLSD` 的字段，缺失时依次回退到 `SIZE`、用 `CWD`/`CDUP` 探测目录、`MDTM`。列出得慢，通常意味着服务器没有 `MLSD`。

## 接口

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| `POST` | `/api/ftp/connect` | `host, port?, user?, password?, secure?, encoding?` | 建立连接，返回 `id` 与初始 `cwd` |
| `POST` | `/api/ftp/disconnect` | `id` | 关闭并移除连接 |
| `GET` | `/api/ftp/list` | `id, path?` | 列出目录，返回 `path` 与 `items` |
| `POST` | `/api/ftp/mkdir` | `id, path` | 新建文件夹 |
| `POST` | `/api/ftp/remove` | `id, path, type` | 删除；`type=dir` 走 `removeDir` |
| `POST` | `/api/ftp/rename` | `id, from, to` | 重命名或移动 |
| `POST` | `/api/ftp/upload` | multipart：`id, path, file` | 上传单个文件 |
| `GET` | `/api/ftp/download` | `id, path` | 下载，支持 `Range` |

参数缺失返回 `400`；FTP 操作失败返回 `502`，`statusMessage` 是底层 FTP 的错误信息。

## 部署

```bash
pnpm build
node .output/server/index.mjs
```

`package.json` 里的 `start` 脚本写成 `set HOST=0.0.0.0&&node ...`，只在 Windows 上有效；macOS 和 Linux 请用 `HOST=0.0.0.0 node .output/server/index.mjs`。

## 安全须知

- **服务端会代替访问者连接任意 FTP 地址**，包括内网地址。请只部署在受信环境，或在前面加一层鉴权。
- **保存的连接密码以明文存在浏览器的 `localStorage` 里**。
- **上传和下载都经过服务端临时文件**（`os.tmpdir()`）：上传先落盘再转发，下载会整文件读进内存后返回。大文件会同时占用临时磁盘和服务端内存。

## License

[MIT](LICENSE)
