<template>
  <div v-if="!connected" class="conn-page">
  <div class="conn-content">
    <div class="topbar glass">
      <span class="mark"></span>
      <h1 style="font-weight: 600; font-size: 15px; margin: 0;">{{ t('app.title') }}</h1>
      <div class="spacer"></div>
      <button class="btn" @click="toggle">{{ locale === 'zh' ? 'EN' : '中文' }}</button>
      <button class="btn primary" @click="openNewConn">{{ t('conn.new') }}</button>
    </div>

    <div class="conn-list-wrap">
      <h2 style="font-size: 18px; margin: 0 0 12px;">{{ t('conn.saved') }}</h2>
      <div v-if="saved.length === 0" class="empty">{{ t('conn.empty') }}</div>
      <div v-for="(c, i) in saved" :key="i" class="conn-card glass tilt-card" @mousemove="tiltCard($event, $event.currentTarget as HTMLElement)" @mouseleave="resetTilt($event.currentTarget as HTMLElement)">
        <div class="conn-card-info">
          <div style="font-weight: 600; font-size: 14px;">{{ c.host }}:{{ c.port }}</div>
          <div class="muted" style="font-size: 12px;">{{ c.user }} · {{ c.secure ? 'FTPS' : 'FTP' }} · {{ c.encoding.toUpperCase() }}</div>
        </div>
        <div class="conn-card-actions">
          <button class="btn primary" :disabled="connectingIndex === i" @click="connectSaved(i)">
            {{ connectingIndex === i ? t('conn.connecting') : t('conn.connect') }}
          </button>
          <button class="btn" @click="openEditConn(i)">{{ t('conn.edit') }}</button>
          <button class="btn danger" @click="deleteSaved(i)">{{ t('conn.delete') }}</button>
        </div>
      </div>
    </div>

    <!-- Connection modal -->
    <div v-if="showConnModal" class="modal-backdrop" @click.self="showConnModal = false">
      <div class="modal">
        <h3>{{ t('conn.modalTitle') }}</h3>
        <div class="field">
          <label>{{ t('conn.host') }}</label>
          <input v-model="connForm.host" class="input" placeholder="ftp.example.com" />
        </div>
        <div class="row2">
          <div class="field">
            <label>{{ t('conn.user') }}</label>
            <input v-model="connForm.user" class="input" placeholder="anonymous" />
          </div>
          <div class="field">
            <label>{{ t('conn.port') }}</label>
            <input v-model.number="connForm.port" class="input" type="number" />
          </div>
        </div>
        <div class="field">
          <label>{{ t('conn.password') }}</label>
          <input v-model="connForm.password" class="input" type="password" placeholder="********" />
        </div>
        <label class="checkbox-row">
          <input v-model="connForm.secure" type="checkbox" />
          {{ t('conn.secure') }}
        </label>
        <div class="field">
          <label>{{ t('conn.encoding') }}</label>
          <select v-model="connForm.encoding" class="input">
            <option value="utf8">UTF-8</option>
            <option value="gbk">GBK (中文)</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="showConnModal = false">{{ t('conn.cancel') }}</button>
          <button class="btn primary" @click="saveConn">{{ t('conn.save') }}</button>
        </div>
        <p v-if="connError" class="muted" style="color: var(--danger); margin: 8px 0 0; font-size: 12px;">{{ connError }}</p>
      </div>
    </div>
  </div>
  </div>

  <div v-else class="main">
    <div v-if="dragOver" class="full-drop-overlay">Drop files here to upload</div>
    <div class="topbar">
      <span class="mark"></span>
      <h1 style="font-weight: 600; font-size: 15px; margin: 0;">{{ t('app.title') }}</h1>
      <div class="conn-info">
        <span class="pill"><span class="dot on"></span>{{ conn.host }}:{{ conn.port }}</span>
        <span class="pill">{{ conn.user }}</span>
        <span v-if="conn.secure" class="pill">FTPS</span>
      </div>
      <div class="spacer"></div>
      <button class="btn" @click="toggle">{{ locale === 'zh' ? 'EN' : '中文' }}</button>
      <button class="btn" @click="refresh" :disabled="loading">{{ t('files.refresh') }}</button>
      <button class="btn" @click="showMkdir = true">{{ t('files.newFolder') }}</button>
      <label class="btn" style="cursor: pointer;">
        {{ t('files.upload') }}
        <input type="file" multiple style="display: none;" @change="onUpload" />
      </label>
      <button class="btn danger" @click="disconnect">{{ t('conn.disconnect') }}</button>
    </div>

    <div class="toolbar">
      <div class="crumbs">
        <span
          v-for="(c, i) in crumbs"
          :key="i"
          class="crumb"
          :class="{ active: i === crumbs.length - 1 }"
          @click="goCrumb(i)"
        >{{ i === 0 ? '/' : c.split('/').pop() }}</span>
      </div>
    </div>

    <div class="table-wrap" @dragover.prevent="dragOver = true" @dragleave="dragOver = false" @drop.prevent="onDrop; dragOver = false" :class="{ 'drag-over': dragOver }">
      <div v-if="dragOver" class="drop-overlay">Drop files here to upload</div>
      <table v-if="items.length">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th class="right">Size</th>
            <th>Modified</th>
            <th class="right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.name">
            <td>
              <div class="name-cell">
                <span class="type-tag">{{ it.type === 'dir' ? 'dir' : 'file' }}</span>
                <a v-if="it.type === 'dir'" href="#" @click.prevent="openDir(it.name)">{{ it.name }}</a>
                <span v-else>{{ it.name }}</span>
              </div>
            </td>
            <td class="muted">{{ it.type }}</td>
            <td class="right muted">{{ it.type === 'dir' ? '-' : formatSize(it.size) }}</td>
            <td class="muted">{{ formatDate(it.modified) }}</td>
            <td class="right">
              <div class="actions">
                
                <button v-if="it.type !== 'dir'" class="link-btn" @click="download(it)">{{ t('files.download') }}</button>
                <button class="link-btn" @click="startRename(it)">{{ t('files.rename') }}</button>
                <button class="link-btn danger" @click="removeItem(it)">{{ t('files.delete') }}</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">
        {{ loading ? t('files.loading') : t('files.empty') }}
      </div>
    </div>

    <div class="status-bar">
      <span>{{ items.length }} {{ t('files.items') }}</span>
      <span v-if="uploadProgress !== null">Upload: {{ uploadProgress }}%</span>
      <span v-if="downloadProgress !== null">Download: {{ downloadProgress }}%</span>
      <span v-if="status">{{ status }}</span>
    </div>
  </div>

  <!-- New folder modal -->
  <div v-if="showMkdir" class="modal-backdrop" @click.self="showMkdir = false">
    <div class="modal">
      <h3>{{ t('modal.newFolder') }}</h3>
      <input v-model="newFolderName" class="input" :placeholder="t('modal.newFolderPlaceholder')" @keyup.enter="createFolder" />
      <div class="modal-actions">
        <button class="btn" @click="showMkdir = false">{{ t('conn.cancel') }}</button>
        <button class="btn primary" @click="createFolder">{{ t('modal.create') }}</button>
      </div>
    </div>
  </div>

  <!-- Rename modal -->
  <div v-if="renameTarget" class="modal-backdrop" @click.self="renameTarget = null">
    <div class="modal">
      <h3>{{ t('modal.rename') }}</h3>
      <input v-model="renameTo" class="input" @keyup.enter="doRename" />
      <div class="modal-actions">
        <button class="btn" @click="renameTarget = null">{{ t('conn.cancel') }}</button>
        <button class="btn primary" @click="doRename">{{ t('conn.save') }}</button>
      </div>
    </div>
  </div>

  <!-- Preview modal removed -->

  <!-- Toast -->
  <div v-if="toast" class="toast" :class="{ err: toast.err }">
  <div>{{ toast.msg }}</div>
  <div v-if="toast.progress !== undefined" class="toast-progress">
    <div class="toast-progress-bar" :style="{ width: toast.progress + '%' }"></div>
  </div>
</div>
</template>

<script setup lang="ts">
const { t, locale, toggle } = useI18n()

const connected = ref(false)
const connectingIndex = ref(-1)
const loading = ref(false)
const conn = ref<any>(null)
const currentPath = ref('/')
const items = ref<any[]>([])
const status = ref('')

const saved = ref<any[]>([])
const showConnModal = ref(false)
const editingIndex = ref(-1)
const connForm = reactive({
  host: '',
  port: 21,
  user: 'anonymous',
  password: '',
  secure: false,
  encoding: 'utf8',
})
const connError = ref('')

const showMkdir = ref(false)
const newFolderName = ref('')
const renameTarget = ref<any>(null)
const renameTo = ref('')
const toast = ref<{ msg: string; err: boolean; progress?: number } | null>(null)

// preview state





const uploadProgress = ref<number | null>(null)
const downloadProgress = ref<number | null>(null)
const dragOver = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)
const bgCanvas = ref<HTMLCanvasElement | null>(null)

let toastTimer: any = null
function showToast(msg: string, err = false, progress?: number) {
  toast.value = { msg, err, progress }
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

// load saved connections
if (import.meta.client) {
  try {
    const raw = localStorage.getItem('ftp-connections')
    if (raw) saved.value = JSON.parse(raw)
  } catch {}
}
function persistSaved() {
  if (import.meta.client) localStorage.setItem('ftp-connections', JSON.stringify(saved.value))
}

function openNewConn() {
  editingIndex.value = -1
  Object.assign(connForm, { host: '', port: 21, user: 'anonymous', password: '', secure: false, encoding: 'utf8' })
  connError.value = ''
  showConnModal.value = true
}
function openEditConn(i: number) {
  editingIndex.value = i
  Object.assign(connForm, saved.value[i])
  connError.value = ''
  showConnModal.value = true
}
function saveConn() {
  if (!connForm.host.trim()) { connError.value = 'Host is required'; return }
  const entry = { ...connForm }
  if (editingIndex.value >= 0) {
    saved.value[editingIndex.value] = entry
  } else {
    saved.value.push(entry)
  }
  persistSaved()
  showConnModal.value = false
}
function deleteSaved(i: number) {
  if (!confirm('Delete this connection?')) return
  saved.value.splice(i, 1)
  persistSaved()
}

const crumbs = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean)
  const result: string[] = ['/']
  let acc = ''
  for (const p of parts) {
    acc += '/' + p
    result.push(acc)
  }
  return result
})

if (import.meta.client) {
  onMounted(async () => {
    try {
      const savedConn = sessionStorage.getItem('ftp-conn')
      const savedCfg = sessionStorage.getItem('ftp-conn-config')
      if (savedConn && savedCfg) {
        conn.value = JSON.parse(savedConn)
        connected.value = true
        const savedPath = sessionStorage.getItem('ftp-path') || '/'
        await loadList(savedPath).catch(async () => {
          try { await connectWithConfig(JSON.parse(savedCfg)) } catch { connected.value = false; conn.value = null }
        })
      }
    } catch {}
  })
}

if (import.meta.client) {
  onMounted(async () => {
    try {
      const savedConn = sessionStorage.getItem('ftp-conn')
      const savedCfg = sessionStorage.getItem('ftp-conn-config')
      if (savedConn && savedCfg) {
        conn.value = JSON.parse(savedConn)
        connected.value = true
        await loadList('/').catch(async () => {
          try { await connectWithConfig(JSON.parse(savedCfg)) } catch { connected.value = false; conn.value = null }
        })
      }
    } catch {}
  })
}

function onBgMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

function tiltCard(e: MouseEvent, el: HTMLElement | null) {
  if (!el) return
  const rect = el.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width - 0.5
  const y = (e.clientY - rect.top) / rect.height - 0.5
  el.style.transform = 'perspective(900px) rotateY(' + (x * 12) + 'deg) rotateX(' + (-y * 12) + 'deg) scale(1.02)'
}

function resetTilt(el: HTMLElement | null) {
  if (el) el.style.transform = ''
}

onMounted(() => {
  if (!import.meta.client) return
  let dragCounter = 0
  const onDragEnter = (e: DragEvent) => { e.preventDefault(); dragCounter++; dragOver.value = true }
  const onDragOver = (e: DragEvent) => { e.preventDefault(); dragOver.value = true }
  const onDragLeave = (e: DragEvent) => { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; dragOver.value = false } }
  const onDrop = (e: DragEvent) => { e.preventDefault(); dragCounter = 0; dragOver.value = false; const files = e.dataTransfer?.files; if (files && files.length) { const fake = { target: { files, value: '' } } as any; onUpload(fake) } }
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})

function formatSize(bytes: number) {
  if (!bytes) return '0 B'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
}
function formatDate(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleString()
}

function previewable(it: any) {
  if (it.type === 'dir') return false
  const ext = (it.name.split('.').pop() || '').toLowerCase()
  const imageExts = ['png','jpg','jpeg','gif','webp','bmp','svg']
  const textExts = ['txt','json','xml','csv','log','md','js','ts','css','html','htm','yml','yaml','ini','conf']
  return imageExts.includes(ext) || textExts.includes(ext)
}
async function connectWithConfig(cfg: any) {
  const res = await $fetch('/api/ftp/connect', {
    method: 'POST',
    body: cfg,
  })
  conn.value = res
  connected.value = true
  currentPath.value = res.cwd || '/'
  await loadList()
  if (import.meta.client) {
    sessionStorage.setItem('ftp-path', currentPath.value)
    sessionStorage.setItem('ftp-conn', JSON.stringify(conn.value))
    sessionStorage.setItem('ftp-conn-config', JSON.stringify(cfg))
  }
}

async function connectSaved(i: number) {
  connectingIndex.value = i
  try {
    await connectWithConfig(saved.value[i])
    // update saved entry with latest (no change)
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.message || 'Connection failed', true)
  } finally {
    connectingIndex.value = -1
  }
}

async function disconnect() {
  try {
    await $fetch('/api/ftp/disconnect', { method: 'POST', body: { id: conn.value.id } })
  } catch {}
  connected.value = false
  conn.value = null
  items.value = []
  currentPath.value = '/'
  if (import.meta.client) { sessionStorage.removeItem('ftp-conn'); sessionStorage.removeItem('ftp-conn-config'); sessionStorage.removeItem('ftp-path') }
}

async function loadList(path?: string) {
  loading.value = true
  status.value = ''
  try {
    const res: any = await $fetch('/api/ftp/list', {
      query: { id: conn.value.id, path: path || currentPath.value },
    })
    currentPath.value = res.path
    items.value = res.items
    if (import.meta.client) sessionStorage.setItem('ftp-path', currentPath.value)
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.message || 'List failed', true)
  } finally {
    loading.value = false
  }
}

async function refresh() {
  await loadList(currentPath.value)
}

async function openDir(name: string) {
  const next = currentPath.value === '/' ? '/' + name : currentPath.value + '/' + name
  await loadList(next)
}

function goCrumb(i: number) {
  if (i === 0) {
    loadList('/')
    return
  }
  const target = crumbs.value[i]
  loadList(target)
}

async function createFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  const path = currentPath.value === '/' ? '/' + name : currentPath.value + '/' + name
  try {
    await $fetch('/api/ftp/mkdir', { method: 'POST', body: { id: conn.value.id, path } })
    showMkdir.value = false
    newFolderName.value = ''
    showToast(t('toast.folderCreated'))
    await loadList(currentPath.value)
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.message || t('toast.failed'), true)
  }
}

function startRename(it: any) {
  renameTarget.value = it
  renameTo.value = it.name
}
async function doRename() {
  if (!renameTarget.value) return
  const from = currentPath.value === '/' ? '/' + renameTarget.value.name : currentPath.value + '/' + renameTarget.value.name
  const to = currentPath.value === '/' ? '/' + renameTo.value : currentPath.value + '/' + renameTo.value
  try {
    await $fetch('/api/ftp/rename', { method: 'POST', body: { id: conn.value.id, from, to } })
    renameTarget.value = null
    showToast(t('toast.renamed'))
    await loadList(currentPath.value)
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.message || t('toast.failed'), true)
  }
}

async function removeItem(it: any) {
  if (!confirm(`Delete ${it.name}?`)) return
  const path = currentPath.value === '/' ? '/' + it.name : currentPath.value + '/' + it.name
  try {
    await $fetch('/api/ftp/remove', { method: 'POST', body: { id: conn.value.id, path, type: it.type } })
    showToast(t('toast.deleted'))
    await loadList(currentPath.value)
  } catch (e: any) {
    showToast(e?.data?.statusMessage || e?.message || t('toast.failed'), true)
  }
}

async function onUpload(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || !files.length) return
  uploadProgress.value = 0
  for (const f of Array.from(files)) {
    const fd = new FormData()
    fd.append('id', conn.value.id)
    fd.append('path', currentPath.value)
    fd.append('file', f)
    showToast(t('toast.uploaded') + ' ' + f.name, false, 0)
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/ftp/upload')
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            uploadProgress.value = Math.round(ev.loaded / ev.total * 100)
            if (toast.value) toast.value.progress = uploadProgress.value
          }
        }
        xhr.onload = () => { if (xhr.status >= 200 && xhr.status < 300) resolve(); else reject(new Error(xhr.responseText)) }
        xhr.onerror = () => reject(new Error('Network error'))
        xhr.send(fd)
      })
      showToast(t('toast.uploaded') + ' ' + f.name)
    } catch (err: any) {
      showToast(err?.message || (t('toast.failed') + ': ' + f.name), true)
    }
  }
  uploadProgress.value = null
  if (input.value !== undefined) input.value = ''
  await loadList(currentPath.value)
}

function onDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (!files || !files.length) return
  const fakeEvent = { target: { files, value: '' } } as any
  onUpload(fakeEvent)
}

async function download(it: any) {
  const path = currentPath.value === '/' ? '/' + it.name : currentPath.value + '/' + it.name
  const url = `/api/ftp/download?id=${encodeURIComponent(conn.value.id)}&path=${encodeURIComponent(path)}`
  downloadProgress.value = 0
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Download failed')
    const total = Number(res.headers.get('Content-Length')) || 0
    const reader = res.body?.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) { chunks.push(value); received += value.length; if (total) downloadProgress.value = Math.round(received / total * 100) }
      }
    }
    const blob = new Blob(chunks as any)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = it.name
    a.click()
    URL.revokeObjectURL(a.href)
  } catch (e: any) {
    showToast(e?.message || t('toast.failed'), true)
  } finally {
    downloadProgress.value = null
  }
}

</script>

<style scoped>
.conn-list-wrap { padding: 24px; max-width: 900px; margin: 0 auto; width: 100%; }
.conn-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--line); /* taste-skill-ignore */
  border-radius: var(--radius);
  background: var(--surface);
  margin-bottom: 10px;
}
.conn-card-info { flex: 1; }
.conn-card-actions { display: flex; gap: 8px; }
</style>

