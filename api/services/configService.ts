import fs from 'fs';
import path from 'path';
import { GlobalConfig, BackupConfig, BackupInfo, LogEntry, Announcement } from '../../shared/types';

const GLOBAL_CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE || __dirname, 'autoSaveBackupTool_config.json');

const ANNOUNCEMENTS: Announcement[] = [
  { content: 'v0.2版本更新：支持文件夹备份，可以备份整个游戏存档目录', date: '2025-04-28' },
  { content: 'v0.4版本更新：新增日志与日志详情，右键日志即可进行回溯操作。优化窗口位置', date: '2025-04-29' },
  { content: 'dev-v0.5版本更新：配置系统更新，数据配置文件(如历史、日志)保存在存档目录路径，基础设置保存用户目录', date: '2025-04-29' },
  { content: 'dev-v0.5.1版本更新：公告更新，鼠标移动到公告栏会开始滚动，避免字数过长导致按钮位置问题', date: '2025-05-06' },
  { content: 'dev-v0.5.2版本更新：兼容旧版本配置文件，启动时检测C:\\Users\\~\\.game_backup_tool目录下的config.json文件', date: '2025-05-06' },
  { content: 'v0.5.3版本更新：新增旧版本配置迁移的历史记录与日志', date: '2025-05-06' },
  { content: 'v0.6版本更新：新增历史备份目录列表进行管理（右键有更多选项）', date: '2025-05-07' },
  { content: 'v0.6.1版本更新：右键备份列表可以还原与删除', date: '2025-05-07' },
  { content: 'v0.6.2版本更新：状态栏状态数量更新、备份文件名时间戳精度提升至毫秒，修复了历史备份目录列表中删除某个目录后还会显示的问题', date: '2025-05-08' },
  { content: 'v1.0 Web版本发布：全新Web界面，支持跨平台访问！', date: '2025-05-24' }
];

export class ConfigService {
  static getGlobalConfig(): GlobalConfig {
    try {
      if (fs.existsSync(GLOBAL_CONFIG_PATH)) {
        const data = fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading global config:', error);
    }
    return {
      sourcePath: '',
      isDirectory: false,
      backupDir: '',
      backupDirs: [],
      interval: 5
    };
  }

  static saveGlobalConfig(config: GlobalConfig): void {
    try {
      fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving global config:', error);
      throw error;
    }
  }

  static getBackupConfigPath(backupDir: string): string {
    return path.join(backupDir, 'config.json');
  }

  static getBackupConfig(backupDir: string): BackupConfig {
    const configPath = this.getBackupConfigPath(backupDir);
    try {
      if (fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error reading backup config:', error);
    }
    return { backups: [], logs: [] };
  }

  static saveBackupConfig(backupDir: string, config: BackupConfig): void {
    const configPath = this.getBackupConfigPath(backupDir);
    try {
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving backup config:', error);
      throw error;
    }
  }

  static getAnnouncements(): Announcement[] {
    return ANNOUNCEMENTS;
  }
}

