import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { challengeService } from '../services/challengeService';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const challenges = await challengeService.listChallenges();
    res.json(challenges);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, topicNumbers } = req.body;

    if (!name || !description || !topicNumbers || !Array.isArray(topicNumbers)) {
      return res.status(400).json({ error: 'name, description, and topicNumbers array are required' });
    }

    if (topicNumbers.length === 0) {
      return res.status(400).json({ error: 'topicNumbers must contain at least one topic' });
    }

    const challenge = await challengeService.createChallenge({
      name,
      description,
      topicNumbers,
      createdBy: req.userId,
    });

    res.status(201).json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await challengeService.getChallengeById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, topicNumbers } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (topicNumbers !== undefined) {
      if (!Array.isArray(topicNumbers) || topicNumbers.length === 0) {
        return res.status(400).json({ error: 'topicNumbers must be a non-empty array' });
      }
      updateData.topicNumbers = topicNumbers;
    }

    const challenge = await challengeService.updateChallenge(req.params.id, updateData);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.json(challenge);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await challengeService.deleteChallenge(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/topics', async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await challengeService.getChallengeById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json({ topicNumbers: challenge.topicNumbers });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

