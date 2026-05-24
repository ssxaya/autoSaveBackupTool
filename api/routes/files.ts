import { Router, Request, Response } from 'express';
import { FileService } from '../services/fileService';
import { ConfigService } from '../services/configService';

const router = Router();

router.get('/files/list', (req: Request, res: Response) => {
  try {
    const { path } = req.query;
    const dirPath = typeof path === 'string' ? path : FileService.getHomeDirectory();
    const files = FileService.listFiles(dirPath);
    res.json({ files, currentPath: dirPath, homePath: FileService.getHomeDirectory() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list files' });
  }
});

router.post('/backup', (req: Request, res: Response) => {
  try {
    const { sourcePath, backupDir, isDirectory } = req.body;
    if (!sourcePath || !backupDir) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const backupInfo = FileService.performBackup(sourcePath, backupDir, isDirectory);
    
    // Update global config with backup directory
    const config = ConfigService.getGlobalConfig();
    if (!config.backupDirs.includes(backupDir)) {
      config.backupDirs.push(backupDir);
    }
    ConfigService.saveGlobalConfig(config);
    
    res.json({ success: true, backupInfo });
  } catch (error) {
    res.status(500).json({ error: 'Failed to perform backup' });
  }
});

router.get('/backups', (req: Request, res: Response) => {
  try {
    const { backupDir } = req.query;
    if (!backupDir || typeof backupDir !== 'string') {
      return res.status(400).json({ error: 'Missing backupDir parameter' });
    }
    const backupConfig = ConfigService.getBackupConfig(backupDir);
    // Filter out backups that no longer exist
    const validBackups = backupConfig.backups.filter(b => FileService.pathExists(b.backupPath));
    res.json({ backups: validBackups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get backups' });
  }
});

router.post('/restore', (req: Request, res: Response) => {
  try {
    const { backupPath, originalPath, isDirectory, backupDir } = req.body;
    FileService.restoreBackup(backupPath, originalPath, isDirectory, backupDir);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

router.delete('/backup', (req: Request, res: Response) => {
  try {
    const { backupPath, backupDir } = req.body;
    FileService.deleteBackup(backupPath, backupDir);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete backup' });
  }
});

router.get('/logs', (req: Request, res: Response) => {
  try {
    const { backupDir } = req.query;
    if (!backupDir || typeof backupDir !== 'string') {
      return res.status(400).json({ error: 'Missing backupDir parameter' });
    }
    const backupConfig = ConfigService.getBackupConfig(backupDir);
    res.json({ logs: backupConfig.logs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

router.get('/path/exists', (req: Request, res: Response) => {
  try {
    const { path } = req.query;
    if (typeof path !== 'string') {
      return res.status(400).json({ error: 'Invalid path' });
    }
    const exists = FileService.pathExists(path);
    const isDirectory = exists ? FileService.isDirectory(path) : false;
    res.json({ exists, isDirectory });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check path' });
  }
});

export default router;

