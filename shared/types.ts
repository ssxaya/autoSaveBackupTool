export interface BackupInfo {
  timestamp: string;
  original: string;
  backupPath: string;
  isDirectory: boolean;
  date: string;
}

export interface LogEntry {
  timestamp: string;
  action: 'backup' | 'restore' | 'delete' | 'restore_deleted' | 'rollback';
  backupInfo: BackupInfo;
  date: string;
}

export interface BackupConfig {
  backups: BackupInfo[];
  logs: LogEntry[];
}

export interface GlobalConfig {
  sourcePath: string;
  isDirectory: boolean;
  backupDir: string;
  backupDirs: string[];
  interval: number;
}

export interface Announcement {
  content: string;
  date: string;
}

