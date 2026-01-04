import { Resend } from 'resend';
import { Interview } from '../models/Interview';
import { ChatMessage } from '../models/ChatMessage';
import { Answer } from '../models/Answer';
import { TopicState } from '../models/TopicState';
import { InterviewSession } from '../models/InterviewSession';
import { Challenge } from '../models/Challenge';
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
      const [messages, answers, topicStates, session, challenge] = await Promise.all([
        ChatMessage.find({ interviewId: new mongoose.Types.ObjectId(interviewId) })
          .sort({ createdAt: 1 })
          .lean(),
        Answer.find({ interviewId: new mongoose.Types.ObjectId(interviewId) })
          .sort({ topicNumber: 1, createdAt: 1 })
          .lean(),
        TopicState.find({ interviewId: new mongoose.Types.ObjectId(interviewId) }).lean(),
        InterviewSession.findOne({ interviewId: new mongoose.Types.ObjectId(interviewId) }).lean(),
        interview.challengeId ? Challenge.findById(interview.challengeId).lean() : Promise.resolve(null),
      ]);

      console.log(`📊 Data loaded: ${messages.length} messages, ${answers.length} answers, ${topicStates.length} topics${challenge ? `, challenge: ${challenge.name}` : ''}`);

      // Generate HTML
      const html = this.generateEmailHTML(interview, messages, answers, topicStates, session, challenge);
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
    session: any,
    challenge: any
  ): string {
    const stats = {
      answered: session?.answeredCount || 0,
      skipped: session?.skippedCount || 0,
      total: (session?.answeredCount || 0) + (session?.skippedCount || 0),
    };

    // Box titles for challenge map
    const boxTitles = [
      'מאפייני האתגר ואיך הוא משפיע על העסק במדדים מוגדרים',
      'השפעת האתגר במדדים/KPI',
      'קהל היעד, היקף וטווח ההשפעה',
      'קשר והשפעה על מיקודים עסקיים',
      'מה ייחשב הצלחה? (בלי קשר ל AI)',
      'מידע חשוב על דאטה/מערכות מידע',
      'סימנים - It\'s Complicated מעידים',
      'מידע רלוונטי נוסף / הערות'
    ];

    let html = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 1000px; margin: 0 auto; padding: 20px; background-color: #fff; }
    .header { background: #f4f4f4; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .challenge-section { margin: 40px 0; padding: 0; }
    .challenge-header { background: #ff6b35; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin: 0; }
    .challenge-header h2 { margin: 0; font-size: 24px; }
    .challenge-fields { background: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-top: none; }
    .challenge-field { margin: 10px 0; }
    .challenge-field-label { font-weight: bold; color: #555; margin-left: 10px; }
    .challenge-field-value { color: #333; }
    .challenge-grid { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .challenge-row { }
    .challenge-box { width: 25%; padding: 15px; border: 2px solid #0066cc; vertical-align: top; background: white; }
    .challenge-box-title { font-weight: bold; color: #0066cc; margin-bottom: 10px; font-size: 14px; min-height: 40px; }
    .challenge-box-content { color: #333; font-size: 13px; }
    .topic-header { font-weight: bold; color: #2c3e50; margin-bottom: 8px; }
    .confidence-badge { display: inline-block; background: #e8f4f8; padding: 3px 8px; border-radius: 3px; font-size: 12px; margin-right: 5px; }
    .covered-points { margin: 8px 0; }
    .covered-points li { margin: 4px 0; font-size: 12px; }
    .qa-item { margin: 8px 0; padding: 8px; background: #f9f9f9; border-radius: 4px; }
    .qa-question { font-weight: bold; color: #2c3e50; font-size: 12px; margin-bottom: 4px; }
    .qa-answer { color: #555; font-size: 12px; }
    .qa-skipped { color: #999; font-style: italic; font-size: 12px; }
    .empty-box { color: #999; font-style: italic; text-align: center; padding: 20px; }
    .stats { display: table; width: 100%; margin: 20px 0; }
    .stat-item { display: table-cell; text-align: center; padding: 15px; background: #e8f4f8; border-radius: 5px; }
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

    // Get all bot messages that are questions (including follow-ups)
    const questionMessages = messages.filter((msg: any) => 
      msg.role === 'bot' && msg.questionText
    );

    // Create a map of questions with their follow-ups and answers
    const questionsWithFollowUps = new Map<string, {
      question: any;
      followUps: any[];
      answer?: any;
    }>();

    // First, add all original questions (not follow-ups)
    questionMessages.forEach((msg: any) => {
      if (!msg.isFollowUp && msg.questionText) {
        const answer = answers.find((a: any) => a.questionText === msg.questionText);
        questionsWithFollowUps.set(msg.questionText, {
          question: msg,
          followUps: [],
          answer,
        });
      }
    });

    // Then, add follow-ups to their original questions
    questionMessages.forEach((msg: any) => {
      if (msg.isFollowUp && msg.originalQuestionText) {
        const original = questionsWithFollowUps.get(msg.originalQuestionText);
        if (original) {
          const followUpAnswer = answers.find((a: any) => a.questionText === msg.questionText);
          original.followUps.push({
            question: msg,
            answer: followUpAnswer,
          });
        }
      }
    });

    // Group questions by topic for display
    const questionsByTopic = new Map<number, Array<{
      question: any;
      followUps: any[];
      answer?: any;
    }>>();
    questionsWithFollowUps.forEach((qData) => {
      const topicNum = qData.question.topicNumber;
      if (!questionsByTopic.has(topicNum)) {
        questionsByTopic.set(topicNum, []);
      }
      questionsByTopic.get(topicNum)!.push(qData);
    });

    // Group answers by topic (for backward compatibility)
    const answersByTopic = new Map<number, any[]>();
    answers.forEach((answer) => {
      if (!answersByTopic.has(answer.topicNumber)) {
        answersByTopic.set(answer.topicNumber, []);
      }
      answersByTopic.get(answer.topicNumber)!.push(answer);
    });

    // Create a map of topic states by topic number
    const topicStatesByNumber = new Map<number, any>();
    topicStates.forEach((ts) => {
      topicStatesByNumber.set(ts.topicNumber, ts);
    });

    // Generate challenge map if challenge exists
    if (challenge) {
      html += this.generateChallengeMap(challenge, topicStatesByNumber, answersByTopic, boxTitles, questionsByTopic);
    } else {
      // Fallback: Generate topic sections without challenge map
      topicStates.forEach((topicState) => {
        const topicQuestions = questionsByTopic.get(topicState.topicNumber) || [];
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
      ${topicQuestions.length > 0 ? topicQuestions.map((qData: any) => {
        let qaHtml = `
      <div class="qa-card">
        <div class="question">${qData.question.questionText}</div>`;
        
        if (qData.answer) {
          if (qData.answer.skipped) {
            qaHtml += '<div class="skipped">דולג</div>';
          } else {
            qaHtml += `<div class="answer">${qData.answer.answerText || 'ללא תשובה'}</div>`;
          }
        } else {
          qaHtml += '<div class="skipped">ללא תשובה</div>';
        }
        
        // Add follow-up questions
        if (qData.followUps.length > 0) {
          qData.followUps.forEach((followUp: any) => {
            qaHtml += `
        <div class="qa-card" style="margin-right: 20px; margin-top: 10px; border-right: 3px solid #667eea;">
          <div class="question" style="font-size: 12px; color: #667eea;">
            <strong>שאלת המשך:</strong> ${followUp.question.questionText}
          </div>`;
            if (followUp.answer) {
              if (followUp.answer.skipped) {
                qaHtml += '<div class="skipped" style="font-size: 11px;">דולג</div>';
              } else {
                qaHtml += `<div class="answer" style="font-size: 11px;">${followUp.answer.answerText || 'ללא תשובה'}</div>`;
              }
            } else {
              qaHtml += '<div class="skipped" style="font-size: 11px;">ללא תשובה</div>';
            }
            qaHtml += `</div>`;
          });
        }
        
        qaHtml += `</div>`;
        return qaHtml;
      }).join('') : '<p>אין תשובות בנושא זה</p>'}
    </div>
`;
      });
    }

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

  private generateChallengeMap(
    challenge: any,
    topicStatesByNumber: Map<number, any>,
    answersByTopic: Map<number, any[]>,
    boxTitles: string[],
    questionsByTopic?: Map<number, Array<{
      question: any;
      followUps: any[];
      answer?: any;
    }>>
  ): string {
    let html = `
    <div class="challenge-section">
      <div class="challenge-header">
        <h2>מפת אתגר: ${challenge.name}</h2>
      </div>
      <div class="challenge-fields">
        <div class="challenge-field">
          <span class="challenge-field-label">תיאור קצר לאתגר:</span>
          <span class="challenge-field-value">${challenge.description || 'לא צוין'}</span>
        </div>
        <div class="challenge-field">
          <span class="challenge-field-label">חטיבה/יחידה קשורה:</span>
          <span class="challenge-field-value">-</span>
        </div>
        <div class="challenge-field">
          <span class="challenge-field-label">תהליך / תוצר / משימה:</span>
          <span class="challenge-field-value">-</span>
        </div>
      </div>
      <table class="challenge-grid" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin-top: 20px;">
`;

    // Create 8 boxes in 2 rows x 4 columns
    for (let row = 0; row < 2; row++) {
      html += '        <tr class="challenge-row">\n';
      for (let col = 0; col < 4; col++) {
        const boxIndex = row * 4 + col;
        const topicNumber = boxIndex + 1; // Topics are 1-indexed
        const topicState = topicStatesByNumber.get(topicNumber);
        const topicAnswers = answersByTopic.get(topicNumber) || [];
        const topicQuestions = questionsByTopic?.get(topicNumber) || [];
        const boxTitle = boxTitles[boxIndex];

        html += `          <td class="challenge-box" style="width: 25%; padding: 15px; border: 2px solid #0066cc; vertical-align: top; background: white;">
            <div class="challenge-box-title">${boxTitle}</div>
            <div class="challenge-box-content">`;

        // Check if this topic belongs to the challenge
        if (challenge.topicNumbers.includes(topicNumber) && topicState) {
          // Topic exists and has data
          html += `
              <div class="topic-header">
                נושא ${topicNumber}
                <span class="confidence-badge">ביטחון: ${(topicState.confidence * 100).toFixed(0)}%</span>
              </div>`;

          if (topicState.coveredPoints && topicState.coveredPoints.length > 0) {
            html += `
              <div class="covered-points">
                <strong>מה למדנו:</strong>
                <ul>
                  ${topicState.coveredPoints.map((point: string) => `<li>${point}</li>`).join('')}
                </ul>
              </div>`;
          }

          // Use questionsByTopic if available, otherwise fall back to answersByTopic
          if (topicQuestions.length > 0) {
            html += `
              <div>
                <strong>שאלות ותשובות:</strong>`;
            topicQuestions.forEach((qData: any) => {
              html += `
                <div class="qa-item">
                  <div class="qa-question">${qData.question.questionText}</div>`;
              if (qData.answer) {
                if (qData.answer.skipped) {
                  html += `<div class="qa-skipped">דולג</div>`;
                } else {
                  html += `<div class="qa-answer">${qData.answer.answerText || 'ללא תשובה'}</div>`;
                }
              } else {
                html += `<div class="qa-skipped">ללא תשובה</div>`;
              }
              html += `</div>`;
              
              // Add follow-up questions
              if (qData.followUps.length > 0) {
                qData.followUps.forEach((followUp: any) => {
                  html += `
                <div class="qa-item" style="margin-right: 15px; border-right: 2px solid #667eea;">
                  <div class="qa-question" style="font-size: 11px; color: #667eea;">
                    <strong>שאלת המשך:</strong> ${followUp.question.questionText}
                  </div>`;
                  if (followUp.answer) {
                    if (followUp.answer.skipped) {
                      html += `<div class="qa-skipped" style="font-size: 10px;">דולג</div>`;
                    } else {
                      html += `<div class="qa-answer" style="font-size: 10px;">${followUp.answer.answerText || 'ללא תשובה'}</div>`;
                    }
                  } else {
                    html += `<div class="qa-skipped" style="font-size: 10px;">ללא תשובה</div>`;
                  }
                  html += `</div>`;
                });
              }
            });
            html += `</div>`;
          } else if (topicAnswers.length > 0) {
            // Fallback to old method if questionsByTopic is not available
            html += `
              <div>
                <strong>שאלות ותשובות:</strong>`;
            topicAnswers.forEach((answer: any) => {
              html += `
                <div class="qa-item">
                  <div class="qa-question">${answer.questionText}</div>`;
              if (answer.skipped) {
                html += `<div class="qa-skipped">דולג</div>`;
              } else {
                html += `<div class="qa-answer">${answer.answerText || 'ללא תשובה'}</div>`;
              }
              html += `</div>`;
            });
            html += `</div>`;
          } else {
            html += `<div class="qa-item">אין תשובות בנושא זה</div>`;
          }
        } else {
          // Empty box
          html += `<div class="empty-box">אין נושאים נוספים</div>`;
        }

        html += `
            </div>
          </td>
`;
      }
      html += '        </tr>\n';
    }

    html += `      </table>
    </div>
`;

    return html;
  }
}

export const emailService = new EmailService();

