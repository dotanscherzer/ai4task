import { useState, useEffect } from 'react';
import { interviewsAPI } from '../services/api';
import './InterviewDetails.css';

interface Interview {
  _id: string;
  managerName: string;
  managerRole?: string;
  status: string;
  shareToken: string;
  selectedTopics: number[];
  createdAt: string;
}

interface InterviewDetailsProps {
  interview: Interview;
  onSendEmail: (interviewId: string) => void;
  onClose: () => void;
}

const InterviewDetails = ({ interview, onSendEmail, onClose }: InterviewDetailsProps) => {
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

  // Group answers by topic
  const answersByTopic = new Map<number, any[]>();
  answers.forEach((answer: any) => {
    if (!answersByTopic.has(answer.topicNumber)) {
      answersByTopic.set(answer.topicNumber, []);
    }
    answersByTopic.get(answer.topicNumber)!.push(answer);
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
            {Array.from(answersByTopic.entries()).map(([topicNumber, topicAnswers]) => (
              <div key={topicNumber} className="topic-qa-section">
                <h4>נושא {topicNumber}</h4>
                {topicAnswers.map((answer: any, idx: number) => (
                  <div key={idx} className="qa-card">
                    <div className="question">{answer.questionText}</div>
                    {answer.skipped ? (
                      <div className="answer skipped">דולג</div>
                    ) : (
                      <div className="answer">{answer.answerText || 'ללא תשובה'}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {answers.length === 0 && (
              <div className="empty-state">אין תשובות עדיין</div>
            )}
          </div>
        )}
      </div>

      {interview.status === 'completed' && (
        <div className="details-actions">
          <button onClick={() => onSendEmail(interview._id)} className="btn-primary">
            שלח מייל סיכום
          </button>
        </div>
      )}
    </div>
  );
};

export default InterviewDetails;

