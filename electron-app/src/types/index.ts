export interface BackupInfo {
  timestamp: string;
  original: string;
  backup_path: string;
  is_directory: boolean;
  date: string;
}

export interface LogEntry {
  timestamp: string;
  date: string;
  action: 'backup' | 'restore' | 'delete' | 'restore_deleted' | 'rollback';
  backup_info: BackupInfo;
}

export interface GlobalConfig {
  source_path: string;
  is_directory: boolean;
  backup_dir: string;
  backup_dirs: string[];
  interval: number;
}

export interface AppState {
  version: string;
  global_config: GlobalConfig;
  backups: BackupInfo[];
  logs: LogEntry[];
  announcements: { content: string; date: string }[];
  isAutoBackupRunning: boolean;
  statusMessage: string;
}

export interface UseBackupStore extends AppState {
  setSourcePath: (path: string, isDirectory: boolean) => void;
  setBackupDir: (path: string) => void;
  setInterval: (interval: number) => void;
  setStatusMessage: (message: string) => void;
  toggleAutoBackup: () => void;
  addBackup: (backup: BackupInfo) => void;
  removeBackup: (timestamp: string) => void;
  addLog: (log: LogEntry) => void;
  restoreBackup: (backup: BackupInfo) => Promise<void>;
  performBackup: () => Promise<void>;
}
