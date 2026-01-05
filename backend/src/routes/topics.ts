import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { topicService } from '../services/topicService';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const topics = await topicService.listTopics();
    res.json(topics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const topic = await topicService.getTopicById(req.params.id);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json(topic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/number/:number', async (req: AuthRequest, res: Response) => {
  try {
    const number = parseInt(req.params.number, 10);
    if (isNaN(number)) {
      return res.status(400).json({ error: 'Invalid topic number' });
    }
    const topic = await topicService.getTopicByNumber(number);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json(topic);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { number, label, description } = req.body;

    if (!number || !label || !description) {
      return res.status(400).json({ error: 'number, label, and description are required' });
    }

    if (typeof number !== 'number' || number <= 0) {
      return res.status(400).json({ error: 'number must be a positive integer' });
    }

    const topic = await topicService.createTopic({
      number,
      label,
      description,
    });

    res.status(201).json(topic);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Error creating topic' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { number, label, description } = req.body;

    const updateData: any = {};
    if (number !== undefined) {
      if (typeof number !== 'number' || number <= 0) {
        return res.status(400).json({ error: 'number must be a positive integer' });
      }
      updateData.number = number;
    }
    if (label !== undefined) updateData.label = label;
    if (description !== undefined) updateData.description = description;

    const topic = await topicService.updateTopic(req.params.id, updateData);
    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    res.json(topic);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await topicService.deleteTopic(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Topic not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

