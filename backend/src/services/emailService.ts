import { Resend } from 'resend';
import { Interview } from '../models/Interview';
import { ChatMessage } from '../models/ChatMessage';
import { Answer } from '../models/Answer';
import { TopicState } from '../models/TopicState';
import { InterviewSession } from '../models/InterviewSession';
import mongoose from 'mongoose';

export class EmailService {
  private resend: Resend;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ RESEND_API_KEY not set. Email features will not work.');
    }
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.FROM_EMAIL || 'Challenge Bot <noreply@example.com>';
  }

  async sendInterviewSummary(interviewId: string): Promise<boolean> {
    try {
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        throw new Error('Interview not found');
      }

      const [messages, answers, topicStates, session] = await Promise.all([
        ChatMessage.find({ interviewId: new mongoose.Types.ObjectId(interviewId) })
          .sort({ createdAt: 1 })
          .lean(),
        Answer.find({ interviewId: new mongoose.Types.ObjectId(interviewId) })
          .sort({ topicNumber: 1, createdAt: 1 })
          .lean(),
        TopicState.find({ interviewId: new mongoose.Types.ObjectId(interviewId) }).lean(),
        InterviewSession.findOne({ interviewId: new mongoose.Types.ObjectId(interviewId) }).lean(),
      ]);

      const html = this.generateEmailHTML(interview, messages, answers, topicStates, session);

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: interview.adminEmail,
        subject: `סיכום ריאיון: ${interview.managerName}`,
        html,
      });

      return !!result.data;
    } catch (error) {
      console.error('Email Service Error:', error);
      throw error;
    }
  }

  private generateEmailHTML(
    interview: any,
    messages: any[],
    answers: any[],
    topicStates: any[],
    session: any
  ): string {
    const stats = {
      answered: session?.answeredCount || 0,
      skipped: session?.skippedCount || 0,
      total: (session?.answeredCount || 0) + (session?.skippedCount || 0),
    };

    let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .topic-section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
    .qa-card { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .question { font-weight: bold; color: #2c3e50; }
    .answer { margin-top: 10px; color: #555; }
    .skipped { color: #999; font-style: italic; }
    .stats { display: flex; gap: 20px; margin: 20px 0; }
    .stat-item { flex: 1; text-align: center; padding: 15px; background: #e8f4f8; border-radius: 5px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>סיכום ריאיון: ${interview.managerName}</h1>
      <p><strong>תפקיד:</strong> ${interview.managerRole || 'לא צוין'}</p>
      <p><strong>סטטוס:</strong> ${interview.status}</p>
      <p><strong>תאריך:</strong> ${new Date(interview.createdAt).toLocaleDateString('he-IL')}</p>
    </div>

    <div class="stats">
      <div class="stat-item">
        <h3>${stats.answered}</h3>
        <p>נענו</p>
      </div>
      <div class="stat-item">
        <h3>${stats.skipped}</h3>
        <p>דולגו</p>
      </div>
      <div class="stat-item">
        <h3>${stats.total}</h3>
        <p>סה"כ</p>
      </div>
    </div>
`;

    // Group answers by topic
    const answersByTopic = new Map<number, any[]>();
    answers.forEach((answer) => {
      if (!answersByTopic.has(answer.topicNumber)) {
        answersByTopic.set(answer.topicNumber, []);
      }
      answersByTopic.get(answer.topicNumber)!.push(answer);
    });

    // Generate topic sections
    topicStates.forEach((topicState) => {
      const topicAnswers = answersByTopic.get(topicState.topicNumber) || [];
      html += `
    <div class="topic-section">
      <h2>נושא ${topicState.topicNumber}</h2>
      <p><strong>ביטחון:</strong> ${(topicState.confidence * 100).toFixed(0)}%</p>
      
      ${topicState.coveredPoints.length > 0 ? `
      <h3>מה למדנו:</h3>
      <ul>
        ${topicState.coveredPoints.map((point: string) => `<li>${point}</li>`).join('')}
      </ul>
      ` : ''}

      <h3>שאלות ותשובות:</h3>
      ${topicAnswers.length > 0 ? topicAnswers.map((answer: any) => `
      <div class="qa-card">
        <div class="question">${answer.questionText}</div>
        ${answer.skipped ? (
          '<div class="skipped">דולג</div>'
        ) : (
          `<div class="answer">${answer.answerText || 'ללא תשובה'}</div>`
        )}
      </div>
      `).join('') : '<p>אין תשובות בנושא זה</p>'}
    </div>
`;
    });

    html += `
    <div class="topic-section">
      <h2>סיכום כללי</h2>
      <p>הריאיון הושלם בהצלחה. כל המידע נשמר במערכת.</p>
    </div>
  </div>
</body>
</html>
`;

    return html;
  }
}

export const emailService = new EmailService();

