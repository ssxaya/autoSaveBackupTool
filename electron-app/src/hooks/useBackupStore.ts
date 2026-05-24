import { create } from 'zustand';
import { AppState, UseBackupStore, BackupInfo, LogEntry } from '../types';

const initialState: AppState = {
  version: '1.0.0',
  global_config: {
    source_path: '',
    is_directory: false,
    backup_dir: '',
    backup_dirs: [],
    interval: 5,
  },
  backups: [],
  logs: [],
  announcements: [
    { content: 'Electron 版本发布，支持 Web 界面', date: '2025-05-24' },
    { content: '支持右键菜单和日志回溯', date: '2025-05-20' },
  ],
  isAutoBackupRunning: false,
  statusMessage: '准备就绪',
};

export const useBackupStore = create<UseBackupStore>((set, get) => ({
  ...initialState,

  setSourcePath: (path: string, isDirectory: boolean) => {
    set((state) => ({
      ...state,
      global_config: { ...state.global_config, source_path: path, is_directory: isDirectory },
    }));
  },

  setBackupDir: (path: string) => {
    set((state) => ({
      ...state,
      global_config: { ...state.global_config, backup_dir: path },
    }));
  },

  setInterval: (interval: number) => {
    set((state) => ({
      ...state,
      global_config: { ...state.global_config, interval },
    }));
  },

  setStatusMessage: (message: string) => {
    set({ statusMessage: message });
  },

  toggleAutoBackup: () => {
    set((state) => ({
      isAutoBackupRunning: !state.isAutoBackupRunning,
      statusMessage: state.isAutoBackupRunning ? '自动备份已停止' : '自动备份已启动',
    }));
  },

  addBackup: (backup: BackupInfo) => {
    set((state) => ({
      ...state,
      backups: [backup, ...state.backups],
    }));
  },

  removeBackup: (timestamp: string) => {
    set((state) => ({
      ...state,
      backups: state.backups.filter((b) => b.timestamp !== timestamp),
    }));
  },

  addLog: (log: LogEntry) => {
    set((state) => ({
      ...state,
      logs: [log, ...state.logs],
    }));
  },

  performBackup: async () => {
    const { global_config, setStatusMessage, addBackup, addLog } = get();
    
    if (!global_config.source_path || !global_config.backup_dir) {
      setStatusMessage('请先选择源文件和备份目录');
      return;
    }

    try {
      const timestamp = Date.now().toString();
      const date = new Date().toLocaleString('zh-CN');
      const backupPath = `${global_config.backup_dir}/backup_${timestamp}`;
      
      const backupInfo: BackupInfo = {
        timestamp,
        original: global_config.source_path,
        backup_path: backupPath,
        is_directory: global_config.is_directory,
        date,
      };

      addBackup(backupInfo);
      addLog({
        timestamp,
        date,
        action: 'backup',
        backup_info: backupInfo,
      });
      
      setStatusMessage(`备份完成: ${backupPath}`);
    } catch (error) {
      setStatusMessage('备份失败: ' + (error as Error).message);
    }
  },

  restoreBackup: async (backup: BackupInfo) => {
    const { setStatusMessage, addLog } = get();
    try {
      const timestamp = Date.now().toString();
      const date = new Date().toLocaleString('zh-CN');
      
      addLog({
        timestamp,
        date,
        action: 'restore',
        backup_info: backup,
      });
      
      setStatusMessage(`已还原: ${backup.backup_path}`);
    } catch (error) {
      setStatusMessage('还原失败: ' + (error as Error).message);
    }
  },
}));
