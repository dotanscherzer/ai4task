import { Resend } from 'resend';
import { Interview } from '../models/Interview';
import { ChatMessage } from '../models/ChatMessage';
import { Answer } from '../models/Answer';
import { TopicState } from '../models/TopicState';
import { InterviewSession } from '../models/InterviewSession';
import mongoose from 'mongoose';

export class EmailService {
  private resend: Resend | null;
  private fromEmail: string;
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    if (!this.apiKey) {
      console.error('❌ RESEND_API_KEY not set. Email features will not work.');
      this.resend = null;
    } else {
      this.resend = new Resend(this.apiKey);
      console.log('✅ EmailService initialized with Resend API key');
    }
    this.fromEmail = process.env.FROM_EMAIL || 'Challenge Bot <noreply@example.com>';
    console.log(`📧 From email: ${this.fromEmail}`);
    
    // Warn if using example.com or unverified domain
    if (this.fromEmail.includes('@example.com') || this.fromEmail.includes('@yourdomain.com')) {
      console.warn('⚠️ WARNING: FROM_EMAIL contains example.com or yourdomain.com. This will not work with Resend.');
      console.warn('⚠️ Please set FROM_EMAIL to a verified domain or use onboarding@resend.dev for testing.');
    }
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async sendInterviewSummary(interviewId: string): Promise<boolean> {
    try {
      // Validate API key
      if (!this.apiKey || !this.resend) {
        throw new Error('RESEND_API_KEY is not configured. Please set the environment variable.');
      }

      console.log(`📤 Starting email send for interview: ${interviewId}`);

      // Fetch interview
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        throw new Error(`Interview not found with ID: ${interviewId}`);
      }

      console.log(`📋 Interview found: ${interview.managerName} (${interview.status})`);

      // Validate admin email
      if (!interview.adminEmail) {
        throw new Error('Interview does not have an admin email address');
      }

      if (!this.validateEmail(interview.adminEmail)) {
        throw new Error(`Invalid email address: ${interview.adminEmail}`);
      }

      console.log(`✉️ Sending email to: ${interview.adminEmail}`);

      // Fetch related data
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

      console.log(`📊 Data loaded: ${messages.length} messages, ${answers.length} answers, ${topicStates.length} topics`);

      // Generate HTML
      const html = this.generateEmailHTML(interview, messages, answers, topicStates, session);
      console.log(`📝 Email HTML generated (${html.length} characters)`);

      // Send email via Resend
      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: interview.adminEmail,
        subject: `סיכום ריאיון: ${interview.managerName}`,
        html,
      });

      if (result.error) {
        console.error('❌ Resend API Error:', result.error);
        
        // Handle specific Resend errors with user-friendly messages
        const error = result.error as any; // Resend error type may vary
        if (error.statusCode === 403 && (error.message?.includes('domain is not verified') || error.message?.includes('not verified'))) {
          const domainMatch = error.message?.match(/The (.+?) domain is not verified/) || 
                            error.message?.match(/domain (.+?) is not verified/);
          const domain = domainMatch ? domainMatch[1] : 'your domain';
          throw new Error(
            `הדומיין ${domain} לא מאומת ב-Resend. ` +
            `אנא הוסף ואמת את הדומיין ב-https://resend.com/domains או ` +
            `השתמש בדומיין מאומת ב-FROM_EMAIL. ` +
            `לבדיקות, ניתן להשתמש ב-onboarding@resend.dev`
          );
        }
        
        // Generic Resend error
        throw new Error(
          `שגיאת Resend API: ${error.message || JSON.stringify(result.error)}`
        );
      }

      if (!result.data) {
        console.error('❌ No data returned from Resend API');
        throw new Error('Failed to send email: No response data from Resend API');
      }

      console.log(`✅ Email sent successfully! ID: ${result.data.id}`);
      return true;
    } catch (error: any) {
      console.error('❌ Email Service Error:', {
        message: error.message,
        stack: error.stack,
        interviewId,
      });
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

    // Generate conclusions based on interview data
    const lowConfidenceTopics = topicStates.filter((ts: any) => ts.confidence < 0.5);
    const skippedCount = answers.filter((a: any) => a.skipped).length;
    const skipRate = stats.total > 0 ? (skippedCount / stats.total) : 0;

    html += `
    <div class="topic-section">
      <h2>מסקנות</h2>
      
      ${lowConfidenceTopics.length > 0 ? `
      <h3>חסמים</h3>
      <ul>
        ${lowConfidenceTopics.map((ts: any) => `<li>נושא ${ts.topicNumber}: ביטחון נמוך (${(ts.confidence * 100).toFixed(0)}%) - ייתכן שדורש הבהרה נוספת</li>`).join('')}
      </ul>
      ` : ''}

      ${skipRate > 0.3 ? `
      <h3>סיכונים</h3>
      <ul>
        <li>שיעור דילוגים גבוה (${(skipRate * 100).toFixed(0)}%) - ${skippedCount} מתוך ${stats.total} שאלות דולגו. ייתכן שיש נושאים שדורשים המשך שיחה.</li>
      </ul>
      ` : ''}

      <h3>Action Items</h3>
      <ul>
        ${lowConfidenceTopics.length > 0 ? `<li>להמשיך לפתח את הנושאים עם ביטחון נמוך: ${lowConfidenceTopics.map((ts: any) => `נושא ${ts.topicNumber}`).join(', ')}</li>` : ''}
        ${skipRate > 0.3 ? `<li>לבחון את השאלות שדולגו ולשקול לחזור אליהן בפגישה נוספת</li>` : ''}
        ${lowConfidenceTopics.length === 0 && skipRate <= 0.3 ? `<li>הריאיון הושלם בהצלחה. כל הנושאים כוסו ברמה מספקת.</li>` : ''}
        <li>לבדוק את המידע שנאסף ולהשתמש בו לבניית מפת אתגר</li>
      </ul>
    </div>

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

