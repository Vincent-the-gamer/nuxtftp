import { ref, computed } from 'vue'

type Locale = 'en' | 'zh'
const locale = ref<Locale>('zh')

const messages: Record<Locale, Record<string, string>> = {
  en: {
    'app.title': 'Nuxt FTP',
    'conn.host': 'Host',
    'conn.port': 'Port',
    'conn.user': 'Username',
    'conn.password': 'Password',
    'conn.secure': 'Use FTPS (TLS)',
    'conn.encoding': 'Filename encoding',
    'conn.new': 'New connection',
    'conn.edit': 'Edit',
    'conn.delete': 'Delete',
    'conn.connect': 'Connect',
    'conn.connecting': 'Connecting…',
    'conn.disconnect': 'Disconnect',
    'conn.saved': 'Saved connections',
    'conn.empty': 'No saved connections. Create one to get started.',
    'conn.modalTitle': 'Connection details',
    'conn.save': 'Save',
    'conn.cancel': 'Cancel',
    'files.title': 'Files',
    'files.refresh': 'Refresh',
    'files.newFolder': 'New folder',
    'files.upload': 'Upload',
    'files.preview': 'Preview',
    'files.download': 'Download',
    'files.rename': 'Rename',
    'files.delete': 'Delete',
    'files.empty': 'This folder is empty.',
    'files.loading': 'Loading…',
    'files.items': 'items',
    'modal.newFolder': 'New folder',
    'modal.newFolderPlaceholder': 'folder name',
    'modal.create': 'Create',
    'modal.rename': 'Rename',
    'toast.uploaded': 'Uploaded',
    'toast.deleted': 'Deleted',
    'toast.renamed': 'Renamed',
    'toast.folderCreated': 'Folder created',
    'toast.failed': 'Operation failed',
    'preview.title': 'Preview',
    'preview.unsupported': 'Preview not available for this file type.',
    'lang.switch': 'Language',
  },
  zh: {
    'app.title': 'Nuxt FTP',
    'conn.host': '主机',
    'conn.port': '端口',
    'conn.user': '用户名',
    'conn.password': '密码',
    'conn.secure': '使用 FTPS (TLS)',
    'conn.encoding': '文件名编码',
    'conn.new': '新建连接',
    'conn.edit': '编辑',
    'conn.delete': '删除',
    'conn.connect': '连接',
    'conn.connecting': '连接中…',
    'conn.disconnect': '断开',
    'conn.saved': '已保存的连接',
    'conn.empty': '暂无已保存的连接，点击新建连接开始。',
    'conn.modalTitle': '连接信息',
    'conn.save': '保存',
    'conn.cancel': '取消',
    'files.title': '文件',
    'files.refresh': '刷新',
    'files.newFolder': '新建文件夹',
    'files.upload': '上传',
    'files.preview': '预览',
    'files.download': '下载',
    'files.rename': '重命名',
    'files.delete': '删除',
    'files.empty': '文件夹为空。',
    'files.loading': '加载中…',
    'files.items': '项',
    'modal.newFolder': '新建文件夹',
    'modal.newFolderPlaceholder': '文件夹名称',
    'modal.create': '创建',
    'modal.rename': '重命名',
    'toast.uploaded': '已上传',
    'toast.deleted': '已删除',
    'toast.renamed': '已重命名',
    'toast.folderCreated': '文件夹已创建',
    'toast.failed': '操作失败',
    'preview.title': '预览',
    'preview.unsupported': '此文件类型不支持预览。',
    'lang.switch': '语言',
  },
}

if (import.meta.client) {
  const stored = localStorage.getItem('ftp-locale')
  if (stored === 'en' || stored === 'zh') locale.value = stored
}

export function useI18n() {
  const t = (key: string) => messages[locale.value][key] ?? key
  const setLocale = (l: Locale) => {
    locale.value = l
    if (import.meta.client) localStorage.setItem('ftp-locale', l)
  }
  const toggle = () => setLocale(locale.value === 'zh' ? 'en' : 'zh')
  return { locale: computed(() => locale.value), t, setLocale, toggle }
}
