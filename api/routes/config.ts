import { Router, Request, Response } from 'express';
import { ConfigService } from '../services/configService';
import { FileService } from '../services/fileService';

const router = Router();

router.get('/config', (req: Request, res: Response) => {
  try {
    const config = ConfigService.getGlobalConfig();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get config' });
  }
});

router.post('/config', (req: Request, res: Response) => {
  try {
    ConfigService.saveGlobalConfig(req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

router.get('/announcements', (req: Request, res: Response) => {
  try {
    const announcements = ConfigService.getAnnouncements();
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get announcements' });
  }
});

export default router;

