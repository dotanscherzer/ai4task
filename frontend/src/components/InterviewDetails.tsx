import { useState, useEffect } from 'react';
import { interviewsAPI } from '../services/api';
import { Interview } from '../types';
import './InterviewDetails.css';

interface InterviewDetailsProps {
  interview: Interview;
  onSendEmail: (interviewId: string) => void;
  onClose: () => void;
  isSendingEmail?: boolean;
}

const InterviewDetails = ({ interview, onSendEmail, onClose, isSendingEmail = false }: InterviewDetailsProps) => {
  const [details, setDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'qa'>('overview');

  useEffect(() => {
    loadDetails();
  }, [interview._id]);

  const loadDetails = async () => {
    try {
      setIsLoading(true);
      const data = await interviewsAPI.get(interview._id);
      setDetails(data);
    } catch (err) {
      console.error('Error loading details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const shareLink = `${window.location.origin}/i/${interview.shareToken}`;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: 'לא התחיל',
      in_progress: 'בתהליך',
      completed: 'הושלם',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="interview-details">
        <div className="loading">טוען פרטים...</div>
      </div>
    );
  }

  const answers = details?.answers || [];
  const messages = details?.messages || [];
  const topicStates = details?.topicStates || [];

  // Get all bot messages that are questions (including follow-ups)
  const questionMessages = messages.filter((msg: any) => 
    msg.role === 'bot' && msg.questionText
  );

  // Create a map of questions with their follow-ups and answers
  const questionsWithFollowUps = new Map<string, {
    question: any;
    followUps: Array<{ question: any; answer?: any }>;
    answer?: any;
  }>();

  // First, add all original questions (not follow-ups) in order
  questionMessages
    .filter((msg: any) => !msg.isFollowUp && msg.questionText)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((msg: any) => {
      const answer = answers.find((a: any) => a.questionText === msg.questionText);
      questionsWithFollowUps.set(msg.questionText, {
        question: msg,
        followUps: [],
        answer,
      });
    });

  // Then, add follow-ups to their original questions
  questionMessages
    .filter((msg: any) => msg.isFollowUp && msg.originalQuestionText)
    .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .forEach((msg: any) => {
      const original = questionsWithFollowUps.get(msg.originalQuestionText);
      if (original) {
        const followUpAnswer = answers.find((a: any) => a.questionText === msg.questionText);
        original.followUps.push({
          question: msg,
          answer: followUpAnswer,
        });
      }
    });

  // Group questions by topic for display
  const questionsByTopic = new Map<number, Array<{
    question: any;
    followUps: Array<{ question: any; answer?: any }>;
    answer?: any;
  }>>();
  questionsWithFollowUps.forEach((qData) => {
    const topicNum = qData.question.topicNumber;
    if (!questionsByTopic.has(topicNum)) {
      questionsByTopic.set(topicNum, []);
    }
    questionsByTopic.get(topicNum)!.push(qData);
  });

  // Sort questions within each topic by creation time
  questionsByTopic.forEach((topicQuestions) => {
    topicQuestions.sort((a, b) => 
      new Date(a.question.createdAt).getTime() - new Date(b.question.createdAt).getTime()
    );
  });

  return (
    <div className="interview-details">
      <div className="details-header">
        <h2>{interview.managerName}</h2>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="details-info">
        <div className="info-item">
          <strong>סטטוס:</strong> {getStatusLabel(interview.status)}
        </div>
        {interview.managerRole && (
          <div className="info-item">
            <strong>תפקיד:</strong> {interview.managerRole}
          </div>
        )}
        {interview.challengeId && (
          <div className="info-item">
            <strong>אתגר:</strong> {typeof interview.challengeId === 'object' ? interview.challengeId.name : 'טוען...'}
            {typeof interview.challengeId === 'object' && interview.challengeId.description && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                {interview.challengeId.description}
              </div>
            )}
          </div>
        )}
        <div className="info-item">
          <strong>לינק שיתוף:</strong>
          <input type="text" value={shareLink} readOnly className="share-link-input" />
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              alert('הלינק הועתק!');
            }}
            className="copy-btn"
          >
            העתק
          </button>
        </div>
      </div>

      <div className="details-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          סקירה
        </button>
        <button
          className={activeTab === 'qa' ? 'active' : ''}
          onClick={() => setActiveTab('qa')}
        >
          שאלות ותשובות
        </button>
      </div>

      <div className="details-content">
        {activeTab === 'overview' && (
          <div>
            <h3>סטטיסטיקות</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{answers.filter((a: any) => !a.skipped).length}</div>
                <div className="stat-label">נענו</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{answers.filter((a: any) => a.skipped).length}</div>
                <div className="stat-label">דולגו</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{topicStates.length}</div>
                <div className="stat-label">נושאים</div>
              </div>
            </div>

            <h3>נושאים</h3>
            <div className="topics-list">
              {topicStates.map((ts: any) => (
                <div key={ts.topicNumber} className="topic-item">
                  <div className="topic-header">
                    <span>נושא {ts.topicNumber}</span>
                    <span className="confidence">
                      ביטחון: {(ts.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  {ts.coveredPoints && ts.coveredPoints.length > 0 && (
                    <ul className="covered-points">
                      {ts.coveredPoints.map((point: string, idx: number) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'qa' && (
          <div>
            <h3>שאלות ותשובות לפי נושא</h3>
            {Array.from(questionsByTopic.entries())
              .sort(([a], [b]) => a - b)
              .map(([topicNumber, topicQuestions]) => (
                <div key={topicNumber} className="topic-qa-section">
                  <h4>נושא {topicNumber}</h4>
                  {topicQuestions.map((qData: any, idx: number) => (
                    <div key={idx}>
                      <div className="qa-card">
                        <div className="question">{qData.question.questionText}</div>
                        {qData.answer ? (
                          qData.answer.skipped ? (
                            <div className="answer skipped">דולג</div>
                          ) : (
                            <div className="answer">{qData.answer.answerText || 'ללא תשובה'}</div>
                          )
                        ) : (
                          <div className="answer skipped">ללא תשובה</div>
                        )}
                      </div>
                      {/* Display follow-up questions */}
                      {qData.followUps.length > 0 && (
                        <div style={{ marginRight: '20px', marginTop: '10px' }}>
                          {qData.followUps.map((followUp: any, followUpIdx: number) => (
                            <div key={followUpIdx} className="qa-card" style={{ borderRight: '3px solid #667eea', marginTop: '10px' }}>
                              <div className="question" style={{ fontSize: '12px', color: '#667eea' }}>
                                <strong>שאלת המשך:</strong> {followUp.question.questionText}
                              </div>
                              {followUp.answer ? (
                                followUp.answer.skipped ? (
                                  <div className="answer skipped" style={{ fontSize: '11px' }}>דולג</div>
                                ) : (
                                  <div className="answer" style={{ fontSize: '11px' }}>{followUp.answer.answerText || 'ללא תשובה'}</div>
                                )
                              ) : (
                                <div className="answer skipped" style={{ fontSize: '11px' }}>ללא תשובה</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            {questionsWithFollowUps.size === 0 && (
              <div className="empty-state">אין תשובות עדיין</div>
            )}
          </div>
        )}
      </div>

      {interview.status === 'completed' && (
        <div className="details-actions">
          <button 
            onClick={() => onSendEmail(interview._id)} 
            className="btn-primary"
            disabled={isSendingEmail}
            style={{ 
              opacity: isSendingEmail ? 0.6 : 1,
              cursor: isSendingEmail ? 'not-allowed' : 'pointer'
            }}
          >
            {isSendingEmail ? 'שולח מייל...' : 'שלח מייל סיכום'}
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewDetails;

