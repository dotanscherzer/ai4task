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
    // Provide more helpful error messages
    if (error.message?.includes('Topics not found') || error.message?.includes('No topics found')) {
      return res.status(400).json({ 
        error: error.message || 'Topics not found. Please ensure topics are seeded in the database.' 
      });
    }
    res.status(500).json({ error: error.message || 'Error creating challenge' });
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

// Questions management routes
router.get('/:id/questions', async (req: AuthRequest, res: Response) => {
  try {
    const challenge = await challengeService.getChallengeById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const questions = await challengeService.getChallengeQuestions(req.params.id);
    res.json(questions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:id/questions', async (req: AuthRequest, res: Response) => {
  try {
    const { topicNumber, questionText } = req.body;

    if (!topicNumber || !questionText) {
      return res.status(400).json({ error: 'topicNumber and questionText are required' });
    }

    const question = await challengeService.createQuestion(req.params.id, {
      topicNumber,
      questionText,
    });

    if (!question) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    res.status(201).json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/questions/:questionId', async (req: AuthRequest, res: Response) => {
  try {
    const { questionText } = req.body;

    if (!questionText) {
      return res.status(400).json({ error: 'questionText is required' });
    }

    const question = await challengeService.updateQuestion(
      req.params.id,
      req.params.questionId,
      questionText
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json(question);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id/questions/:questionId', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await challengeService.deleteQuestion(
      req.params.id,
      req.params.questionId
    );

    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

