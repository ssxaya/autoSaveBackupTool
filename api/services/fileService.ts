import fs from 'fs';
import path from 'path';
import { BackupInfo, LogEntry } from '../../shared/types';
import { ConfigService } from './configService';

export class FileService {
  static copyFile(source: string, dest: string): void {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(source, dest);
  }

  static copyDirectory(source: string, dest: string): void {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(source);
    for (const file of files) {
      const srcPath = path.join(source, file);
      const destPath = path.join(dest, file);
      if (fs.statSync(srcPath).isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        this.copyFile(srcPath, destPath);
      }
    }
  }

  static deleteFileOrDirectory(path: string): void {
    if (fs.existsSync(path)) {
      if (fs.statSync(path).isDirectory()) {
        fs.rmSync(path, { recursive: true, force: true });
      } else {
        fs.unlinkSync(path);
      }
    }
  }

  static getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}_${milliseconds}`;
  }

  static performBackup(sourcePath: string, backupDir: string, isDirectory: boolean): BackupInfo {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = this.getTimestamp();
    const sourceName = path.basename(sourcePath);
    const backupPath = path.join(backupDir, `${sourceName}_${timestamp}`);

    if (isDirectory) {
      this.copyDirectory(sourcePath, backupPath);
    } else {
      this.copyFile(sourcePath, backupPath);
    }

    const backupInfo: BackupInfo = {
      timestamp,
      original: sourcePath,
      backupPath,
      isDirectory,
      date: new Date().toLocaleString('zh-CN')
    };

    // Update backup config
    const backupConfig = ConfigService.getBackupConfig(backupDir);
    backupConfig.backups.push(backupInfo);
    ConfigService.saveBackupConfig(backupDir, backupConfig);

    // Add log
    this.addLog(backupDir, 'backup', backupInfo);

    return backupInfo;
  }

  static restoreBackup(backupPath: string, originalPath: string, isDirectory: boolean, backupDir: string): void {
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file/directory not found');
    }

    // First backup current state
    if (fs.existsSync(originalPath)) {
      const timestamp = this.getTimestamp();
      const sourceName = path.basename(originalPath);
      const tempBackupPath = path.join(backupDir, `${sourceName}_pre_restore_${timestamp}`);
      
      if (isDirectory) {
        this.copyDirectory(originalPath, tempBackupPath);
      } else {
        this.copyFile(originalPath, tempBackupPath);
      }
    }

    // Delete original
    this.deleteFileOrDirectory(originalPath);

    // Restore backup
    if (isDirectory) {
      this.copyDirectory(backupPath, originalPath);
    } else {
      this.copyFile(backupPath, originalPath);
    }

    // Get backup info for logging
    const backupConfig = ConfigService.getBackupConfig(backupDir);
    const backupInfo = backupConfig.backups.find(b => b.backupPath === backupPath);
    if (backupInfo) {
      this.addLog(backupDir, 'restore', backupInfo);
    }
  }

  static deleteBackup(backupPath: string, backupDir: string): void {
    // Get backup info before deleting
    const backupConfig = ConfigService.getBackupConfig(backupDir);
    const backupInfo = backupConfig.backups.find(b => b.backupPath === backupPath);

    // Delete file/directory
    this.deleteFileOrDirectory(backupPath);

    // Update config
    backupConfig.backups = backupConfig.backups.filter(b => b.backupPath !== backupPath);
    ConfigService.saveBackupConfig(backupDir, backupConfig);

    // Add log
    if (backupInfo) {
      this.addLog(backupDir, 'delete', backupInfo);
    }
  }

  static addLog(backupDir: string, action: LogEntry['action'], backupInfo: BackupInfo): void {
    const backupConfig = ConfigService.getBackupConfig(backupDir);
    const logEntry: LogEntry = {
      timestamp: this.getTimestamp(),
      action,
      backupInfo,
      date: new Date().toLocaleString('zh-CN')
    };
    backupConfig.logs.push(logEntry);
    ConfigService.saveBackupConfig(backupDir, backupConfig);
  }

  static listFiles(dirPath: string): Array<{ name: string; path: string; isDirectory: boolean }> {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    const files = fs.readdirSync(dirPath);
    return files.map(name => {
      const fullPath = path.join(dirPath, name);
      return {
        name,
        path: fullPath,
        isDirectory: fs.statSync(fullPath).isDirectory()
      };
    });
  }

  static getHomeDirectory(): string {
    return process.env.HOME || process.env.USERPROFILE || '/';
  }

  static pathExists(pathStr: string): boolean {
    return fs.existsSync(pathStr);
  }

  static isDirectory(pathStr: string): boolean {
    return fs.existsSync(pathStr) && fs.statSync(pathStr).isDirectory();
  }
}

