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
      return res.status(400).json({ 
        error: 'interview_id is required',
        details: 'Please provide a valid interview ID in the request body'
      });
    }

    console.log(`📧 Email send request for interview: ${interview_id} by user: ${req.userId}`);

    // Verify interview belongs to admin
    const interview = await interviewService.getInterviewById(interview_id, req.userId);
    if (!interview) {
      console.warn(`⚠️ Interview not found or access denied: ${interview_id} for user: ${req.userId}`);
      return res.status(404).json({ 
        error: 'Interview not found',
        details: 'The interview does not exist or you do not have permission to access it'
      });
    }

    // Validate interview has admin email
    if (!interview.adminEmail) {
      console.error(`❌ Interview ${interview_id} missing adminEmail`);
      return res.status(400).json({
        error: 'Interview missing email address',
        details: 'The interview does not have an admin email address configured'
      });
    }

    // Send email
    const success = await emailService.sendInterviewSummary(interview_id);

    if (success) {
      console.log(`✅ Email sent successfully for interview: ${interview_id}`);
      res.json({ 
        ok: true,
        message: 'Email sent successfully',
        recipient: interview.adminEmail
      });
    } else {
      console.error(`❌ Email send returned false for interview: ${interview_id}`);
      res.status(500).json({ 
        error: 'Failed to send email',
        details: 'The email service returned an error. Please check server logs for details.'
      });
    }
  } catch (error: any) {
    console.error('❌ Email route error:', {
      message: error.message,
      stack: error.stack,
      interview_id: req.body.interview_id,
      userId: req.userId
    });

    // Provide more detailed error messages
    let errorMessage = error.message || 'Failed to send email';
    let statusCode = 500;

    // Handle specific error types
    if (error.message?.includes('RESEND_API_KEY')) {
      statusCode = 503; // Service Unavailable
      errorMessage = 'Email service is not configured. Please contact the administrator.';
    } else if (error.message?.includes('domain is not verified') || error.message?.includes('לא מאומת')) {
      statusCode = 400;
      errorMessage = error.message; // Already in Hebrew from EmailService
    } else if (error.message?.includes('Invalid email')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = error.message;
    }

    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

