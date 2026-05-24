import { create } from 'zustand';
import { GlobalConfig, BackupInfo, LogEntry, Announcement } from '../../shared/types';
import { apiGet, apiPost, apiDelete } from '../utils/api';

interface AppState {
  config: GlobalConfig;
  backups: BackupInfo[];
  logs: LogEntry[];
  announcements: Announcement[];
  isAutoBackupRunning: boolean;
  status: string;
  setConfig: (config: Partial<GlobalConfig>) => void;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  loadBackups: () => Promise<void>;
  loadLogs: () => Promise<void>;
  loadAnnouncements: () => Promise<void>;
  performBackup: () => Promise<void>;
  restoreBackup: (backup: BackupInfo) => Promise<void>;
  deleteBackup: (backup: BackupInfo) => Promise<void>;
  toggleAutoBackup: () => void;
  setStatus: (status: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  config: {
    sourcePath: '',
    isDirectory: false,
    backupDir: '',
    backupDirs: [],
    interval: 5
  },
  backups: [],
  logs: [],
  announcements: [],
  isAutoBackupRunning: false,
  status: '准备就绪',

  setConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),

  loadConfig: async () => {
    try {
      const data = await apiGet<GlobalConfig>('/api/config');
      set({ 
        config: {
          sourcePath: data.sourcePath || '',
          isDirectory: data.isDirectory || false,
          backupDir: data.backupDir || '',
          backupDirs: data.backupDirs || [],
          interval: data.interval || 5
        } 
      });
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  },

  saveConfig: async () => {
    try {
      const { config } = get();
      await apiPost('/api/config', config);
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  },

  loadBackups: async () => {
    try {
      const { config } = get();
      if (!config.backupDir) {
        set({ backups: [] });
        return;
      }
      const data = await apiGet<{ backups: BackupInfo[] }>(`/api/files/backups?backupDir=${encodeURIComponent(config.backupDir)}`);
      set({ backups: data.backups.reverse() });
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  },

  loadLogs: async () => {
    try {
      const { config } = get();
      if (!config.backupDir) {
        set({ logs: [] });
        return;
      }
      const data = await apiGet<{ logs: LogEntry[] }>(`/api/files/logs?backupDir=${encodeURIComponent(config.backupDir)}`);
      set({ logs: data.logs.reverse() });
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  },

  loadAnnouncements: async () => {
    try {
      const data = await apiGet<Announcement[]>('/api/config/announcements');
      set({ announcements: data });
    } catch (error) {
      console.error('Failed to load announcements:', error);
    }
  },

  performBackup: async () => {
    try {
      const { config } = get();
      if (!config.sourcePath || !config.backupDir) {
        set({ status: '请先选择源文件和备份目录' });
        return;
      }
      set({ status: '正在备份...' });
      const data = await apiPost<{ success: boolean; backupInfo: BackupInfo }>('/api/files/backup', {
        sourcePath: config.sourcePath,
        backupDir: config.backupDir,
        isDirectory: config.isDirectory
      });
      if (data.success) {
        set({ status: '备份成功！' });
        await get().loadBackups();
        await get().loadLogs();
        // Update config with new backupDir if needed
        if (!config.backupDirs.includes(config.backupDir)) {
          get().setConfig({ backupDirs: [...config.backupDirs, config.backupDir] });
          await get().saveConfig();
        }
      }
    } catch (error) {
      console.error('Failed to perform backup:', error);
      set({ status: '备份失败' });
    }
  },

  restoreBackup: async (backup: BackupInfo) => {
    try {
      const { config } = get();
      set({ status: '正在还原...' });
      const data = await apiPost<{ success: boolean }>('/api/files/restore', {
        backupPath: backup.backupPath,
        originalPath: backup.original,
        isDirectory: backup.isDirectory,
        backupDir: config.backupDir
      });
      if (data.success) {
        set({ status: '还原成功！' });
        await get().loadLogs();
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      set({ status: '还原失败' });
    }
  },

  deleteBackup: async (backup: BackupInfo) => {
    try {
      const { config } = get();
      set({ status: '正在删除...' });
      const data = await apiDelete<{ success: boolean }>('/api/files/backup', {
        backupPath: backup.backupPath,
        backupDir: config.backupDir
      });
      if (data.success) {
        set({ status: '删除成功！' });
        await get().loadBackups();
        await get().loadLogs();
      }
    } catch (error) {
      console.error('Failed to delete backup:', error);
      set({ status: '删除失败' });
    }
  },

  toggleAutoBackup: () => {
    const { isAutoBackupRunning, config, performBackup } = get();
    if (isAutoBackupRunning) {
      set({ isAutoBackupRunning: false, status: '自动备份已停止' });
    } else {
      if (!config.sourcePath || !config.backupDir) {
        set({ status: '请先选择源文件和备份目录' });
        return;
      }
      set({ isAutoBackupRunning: true, status: '自动备份已启动' });
    }
  },

  setStatus: (status) => set({ status })
}));

