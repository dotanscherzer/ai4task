import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { interviewService } from '../services/interviewService';

const router = express.Router();

router.use(authenticateToken);

router.post('/send', async (req: AuthRequest, res: Response) => {
  try {
    const { interview_id } = req.body;

    if (!interview_id) {
      return res.status(400).json({ error: 'interview_id is required' });
    }

    // Verify interview belongs to admin
    const interview = await interviewService.getInterviewById(req.body.interview_id, req.userId);
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const success = await emailService.sendInterviewSummary(interview_id);

    if (success) {
      res.json({ ok: true });
    } else {
      res.status(500).json({ error: 'Failed to send email' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

