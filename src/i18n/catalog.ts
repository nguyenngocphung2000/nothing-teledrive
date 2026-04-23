/** Chuỗi UI — mặc định en; thêm locale bằng cách bổ sung vào `bundles`. */

export const en = {
  appLoading: 'Starting Telegram client…',
  appError: 'Could not connect to Telegram',
  appRetry: 'Try again',
  appUnknown: 'Unknown state — please reload.',

  loginTitle: 'Telegram Cloud Storage',
  loginSubtitle: 'Nothing',
  loginGenerating: 'Creating QR code…',
  loginRetry: 'Retry login',
  loginSteps: 'Telegram → Settings → Devices → Link Desktop Device → scan the code.',
  loginFallback: 'Open link if scan fails',

  brand: 'TeleDrive',
  tagline: 'Nothing',
  author: 'Nothing',
  upload: 'Upload',
  sync: 'Sync',
  syncing: 'Syncing…',
  logout: 'Log out',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  language: 'Language',
  langSystem: 'Match system',

  storage: 'Save files to',
  storageLoading: 'Loading chats…',
  storageHint: 'Choose a chat or group you can post to.',
  savedMessages: 'Saved Messages',
  signedInAs: 'Signed in',
  kindSaved: 'Saved',
  kindPrivate: 'Private',
  kindGroup: 'Group',
  kindChannel: 'Channel',

  myDrive: 'My drive',
  virtualFolders: 'Folders',
  createFolder: 'New folder',
  folderName: 'Folder name',
  moveTo: 'Move to folder',
  noFolder: 'None',

  trash: 'Trash (Telegram)',

  dropHint: 'Drag & drop or choose files — any type, up to 2 GB each (Telegram limit).',
  uploading: 'Uploading…',
  queueTitle: 'Transfer queue',
  queueUpload: 'Upload',
  queueDownload: 'Download',
  queuePending: 'Queued',
  queueRunning: 'In progress',
  queueComplete: 'Done',
  queueFailed: 'Failed',
  queueDismiss: 'Remove',
  empty: 'No files yet',
  emptyHint: 'Upload or drag files to store them in Telegram.',

  search: 'Search by name…',
  filterType: 'Type',
  allTypes: 'All',
  typeImage: 'Images',
  typeVideo: 'Video',
  typeAudio: 'Audio',
  typeDoc: 'Documents',
  typeArchive: 'Archives',
  typeOther: 'Other',
  dateFrom: 'From',
  dateTo: 'To',
  sizeMaxMB: 'Max size (MB)',
  clearFilters: 'Clear filters',

  breadcrumbFiles: 'Files',
  grid: 'Grid',
  list: 'List',

  nameCol: 'Name',
  sizeCol: 'Size',
  dateCol: 'Uploaded',

  download: 'Download',
  delete: 'Delete',
  forward: 'Forward',
  forwardPlaceholder: '@username or link',
  forwardSend: 'Send',
  forwarded: 'Forwarded',
  enterPeer: 'Enter a username or link first',
  close: 'Close',

  deleteConfirm: 'Delete “{name}” from this chat?',
  deleteManyConfirm: 'Delete {n} files from this chat?',
  fileTooLarge: 'File exceeds 2 GB (Telegram limit).',

  selectAll: 'Select all',
  clearSelection: 'Clear',
  selectedCount: '{n} selected',
  deleteSelected: 'Delete selected',
  downloadSelected: 'Download selected',
  transferSelected: 'Transfer selected',

  downloadAll: 'Download all',
  downloadAllConfirm:
    'Download all {n} files? They download one by one so the page stays responsive.',
  downloadAllQueue: 'All files ({current}/{total})',
  loadMoreFiles: 'Load more',
  listPartial: 'Showing {shown} of {total}. Load more or narrow search.',

  apiRateLimited: 'Telegram API rate limit reached',
  apiAutoRetry: 'Auto-retry in {seconds}s. Thumbnails keep loading when ready.',

  // File Leecher
  fileLeecher: 'File Leecher',
  selectSource: 'Select Source',
  loadFiles: 'Load Files',
  selectFiles: 'Select Files',
  selectDestination: 'Select Destination',
  startTransfer: 'Start Transfer',
  downloading: 'Downloading...',
  completed: 'Completed',
  transferError: 'Error',
  restricted: 'Restricted',
}

export type MessageKey = keyof typeof en

export const vi: Record<MessageKey, string> = {
  appLoading: 'Đang khởi tạo Telegram client…',
  appError: 'Không kết nối được Telegram',
  appRetry: 'Thử lại',
  appUnknown: 'Trạng thái không xác định — vui lòng tải lại trang.',

  loginTitle: 'Telegram Cloud Storage',
  loginSubtitle: 'Nothing',
  loginGenerating: 'Đang tạo mã QR…',
  loginRetry: 'Tải lại đăng nhập',
  loginSteps: 'Telegram → Cài đặt → Thiết bị → Liên kết thiết bị → quét mã.',
  loginFallback: 'Mở bằng link nếu quét không được',

  brand: 'TeleDrive',
  tagline: 'Nothing',
  author: 'Nothing',
  upload: 'Tải lên',
  sync: 'Đồng bộ',
  syncing: 'Đang đồng bộ…',
  logout: 'Đăng xuất',
  theme: 'Giao diện',
  themeLight: 'Sáng',
  themeDark: 'Tối',
  themeSystem: 'Theo hệ thống',
  language: 'Ngôn ngữ',
  langSystem: 'Theo hệ thống',

  storage: 'Lưu file vào',
  storageLoading: 'Đang tải danh sách chat…',
  storageHint: 'Chọn đoạn chat hoặc nhóm/kênh mà bạn có quyền gửi file.',
  savedMessages: 'Saved Messages',
  signedInAs: 'Đăng nhập',
  kindSaved: 'Đã lưu',
  kindPrivate: 'Cá nhân',
  kindGroup: 'Nhóm',
  kindChannel: 'Kênh',

  myDrive: 'My Drive',
  virtualFolders: 'Thư mục',
  createFolder: 'Thư mục mới',
  folderName: 'Tên thư mục',
  moveTo: 'Chuyển vào thư mục',
  noFolder: 'Không',

  trash: 'Thùng rác (Telegram)',

  dropHint: 'Kéo thả hoặc chọn file — mọi định dạng, tối đa 2 GB/file (giới hạn Telegram).',
  uploading: 'Đang tải lên…',
  queueTitle: 'Hàng đợi tải lên / tải xuống',
  queueUpload: 'Tải lên',
  queueDownload: 'Tải xuống',
  queuePending: 'Đang chờ',
  queueRunning: 'Đang chạy',
  queueComplete: 'Xong',
  queueFailed: 'Lỗi',
  queueDismiss: 'Bỏ',
  empty: 'Chưa có file',
  emptyHint: 'Tải lên hoặc kéo file để lưu trên Telegram.',

  search: 'Tìm theo tên…',
  filterType: 'Loại',
  allTypes: 'Tất cả',
  typeImage: 'Ảnh',
  typeVideo: 'Video',
  typeAudio: 'Âm thanh',
  typeDoc: 'Tài liệu',
  typeArchive: 'Nén',
  typeOther: 'Khác',
  dateFrom: 'Từ ngày',
  dateTo: 'Đến ngày',
  sizeMaxMB: 'Dung lượng tối đa (MB)',
  clearFilters: 'Xóa lọc',

  breadcrumbFiles: 'Files',
  grid: 'Lưới',
  list: 'Danh sách',

  nameCol: 'Tên file',
  sizeCol: 'Kích thước',
  dateCol: 'Ngày tải',

  download: 'Tải xuống',
  delete: 'Xóa',
  forward: 'Chuyển tiếp',
  forwardPlaceholder: '@username hoặc link',
  forwardSend: 'Gửi',
  forwarded: 'Đã chuyển tiếp',
  enterPeer: 'Nhập username hoặc link trước',
  close: 'Đóng',

  deleteConfirm: 'Xóa “{name}” khỏi cuộc trò chuyện này?',
  deleteManyConfirm: 'Xóa {n} file khỏi cuộc trò chuyện này?',
  fileTooLarge: 'File vượt quá 2 GB (giới hạn Telegram).',

  selectAll: 'Chọn tất cả',
  clearSelection: 'Bỏ chọn',
  selectedCount: 'Đã chọn {n}',
  deleteSelected: 'Xóa đã chọn',
  downloadSelected: 'Tải đã chọn',
  transferSelected: 'Chuyển đã chọn',

  downloadAll: 'Tải tất cả',
  downloadAllConfirm:
    'Tải xuống tất cả {n} file? Từng file tải lần lượt để trang không bị treo.',
  downloadAllQueue: 'Tất cả file ({current}/{total})',
  loadMoreFiles: 'Xem thêm',
  listPartial: 'Hiển thị {shown} / {total} file. Bấm “Xem thêm” hoặc tìm kiếm để thu hẹp.',

  apiRateLimited: 'Đạt giới hạn Telegram API',
  apiAutoRetry: 'Tự thử lại sau {seconds}s. Thumbnail sẽ tiếp tục tải khi sẵn sàng.',

  // File Leecher
  fileLeecher: 'File Leecher',
  selectSource: 'Chọn Nguồn',
  loadFiles: 'Tải File',
  selectFiles: 'Chọn File',
  selectDestination: 'Chọn Đích',
  startTransfer: 'Bắt Đầu Chuyển',
  downloading: 'Đang Tải Xuống...',
  completed: 'Hoàn Thành',
  transferError: 'Lỗi',
  restricted: 'Bị Hạn Chế',
}

/** Chỉ en + vi; thiếu key fallback en. */
export const bundles: Record<string, Partial<typeof en>> = {
  en,
  vi,
}

export const SUPPORTED_LOCALE_CODES = ['en', 'vi'] as const

export function resolveLocale(preferred: string | null): string {
  if (!preferred || preferred === 'system') {
    const nav = typeof navigator !== 'undefined' ? navigator.language : 'en'
    const short = (nav.split('-')[0] ?? 'en').toLowerCase()
    if (short === 'vi') return 'vi'
    return 'en'
  }
  if (preferred === 'vi') return 'vi'
  return 'en'
}

export function translate(locale: string, key: MessageKey): string {
  const merged = {
    ...en,
    ...(bundles[locale] ?? {}),
    ...(bundles[locale.split('-')[0]] ?? {}),
  }
  const v = merged[key]
  return typeof v === 'string' && v.length > 0 ? v : en[key]
}
