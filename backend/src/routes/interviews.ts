import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { interviewService } from '../services/interviewService';
import { challengeService } from '../services/challengeService';
import { Question } from '../models/Question';
import { Answer } from '../models/Answer';
import { ChatMessage } from '../models/ChatMessage';
import { TopicState } from '../models/TopicState';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const interviews = await interviewService.listInterviews(req.userId);
    res.json(interviews);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { managerName, managerRole, adminEmail, selectedTopics, questionIds, challengeId } = req.body;

    if (!managerName || !selectedTopics || selectedTopics.length === 0) {
      return res.status(400).json({ error: 'managerName and selectedTopics are required' });
    }

    // Validate challengeId if provided
    if (challengeId) {
      const challenge = await challengeService.getChallengeById(challengeId);
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      // Validate that all selected topics belong to the challenge
      const isValid = await challengeService.validateTopicsBelongToChallenge(
        challengeId,
        selectedTopics
      );
      if (!isValid) {
        return res.status(400).json({ error: 'Selected topics must belong to the specified challenge' });
      }
    }

    const interview = await interviewService.createInterview({
      adminUserId: req.userId,
      adminEmail: adminEmail || process.env.ADMIN_EMAIL || 'dotan.scherzer@gmail.com',
      managerName,
      managerRole,
      selectedTopics,
      questionIds,
      challengeId,
    });

    res.status(201).json(interview);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const interview = await interviewService.getInterviewById(req.params.id, req.userId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interviewObjectId = new mongoose.Types.ObjectId(req.params.id);

    // Get related data
    const [answers, messages, topicStates] = await Promise.all([
      Answer.find({ interviewId: interviewObjectId }).sort({ topicNumber: 1, createdAt: 1 }).lean(),
      ChatMessage.find({ interviewId: interviewObjectId })
        .sort({ createdAt: 1 })
        .limit(100)
        .lean(),
      TopicState.find({ interviewId: interviewObjectId }).lean(),
    ]);

    res.json({
      interview,
      answers,
      messages,
      topicStates,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/questions', async (req: AuthRequest, res: Response) => {
  try {
    const interview = await interviewService.getInterviewById(req.params.id, req.userId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const interviewData = await interviewService.getInterviewByToken(interview.shareToken);
    res.json(interviewData.questions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const deleted = await interviewService.deleteInterview(req.params.id, req.userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

