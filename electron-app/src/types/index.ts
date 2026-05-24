export interface BackupInfo {
  timestamp: string
  original: string
  backup_path: string
  is_directory: boolean
  date: string
}

export interface LogEntry {
  timestamp: string
  date: string
  action: 'backup' | 'restore' | 'delete' | 'restore_deleted' | 'rollback'
  backup_info: BackupInfo
}

export interface GlobalConfig {
  source_path: string
  is_directory: boolean
  backup_dir: string
  backup_dirs: string[]
  interval: number
}

export interface BackupConfig {
  backups: BackupInfo[]
  logs: LogEntry[]
}

export interface AppState {
  version: string
  global_config: GlobalConfig
  backup_config: BackupConfig
  announcements: { content: string; date: string }[]
  is_running: boolean
}

export interface ApiResponse<T = any> {
  success?: boolean
  error?: string
  errors?: string[]
  backups?: BackupInfo[]
  logs?: LogEntry[]
  backup_info?: BackupInfo
  [key: string]: T
}
