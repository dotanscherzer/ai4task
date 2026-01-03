import { useState, useEffect } from 'react';
import './CreateInterviewModal.css';
import { challengesAPI } from '../services/api';
import { Challenge } from '../types';

interface CreateInterviewModalProps {
  onClose: () => void;
  onSubmit: (data: {
    managerName: string;
    managerRole?: string;
    adminEmail?: string;
    selectedTopics: number[];
    challengeId?: string;
  }) => void;
}

const TOPICS = [
  { 
    number: 1, 
    label: 'תיאור האתגר והכאב המרכזי',
    description: 'שאלות על איפה בדיוק "כואב" בפירוק HLD, איך האתגר מתבטא בשטח ולמה זה קורה'
  },
  { 
    number: 2, 
    label: 'השפעה עסקית ומיקודים ארגוניים',
    description: 'שאלות על מיקודים עסקיים שנפגעים, הפגיעות המשמעותיות והעלות העסקית של פירוק לא טוב'
  },
  { 
    number: 3, 
    label: 'קהל יעד, היקף ותלותים',
    description: 'שאלות על צרכני הפירוק, היקף המדורים, תדירות, סוגי פרויקטים בעייתיים וצווארי בקבוק'
  },
  { 
    number: 4, 
    label: 'מדדים (KPI) והשפעה מדידה',
    description: 'שאלות על מדדים שנפגעים בפועל ויעדי השיפור הרצויים'
  },
  { 
    number: 5, 
    label: 'מה נחשב הצלחה (ללא קשר ל-AI)',
    description: 'שאלות על Definition of Ready, המינימום המספיק, גרנולריות וקריטריוני אישור'
  },
  { 
    number: 6, 
    label: 'דאטה, כלים ותשתית תומכת',
    description: 'שאלות על כלי Backlog, שמירת HLD, תבניות, אוצר מילים אחיד ומגבלות מידע'
  },
  { 
    number: 7, 
    label: 'מורכבות, סיכונים ושינוי ארגוני',
    description: 'שאלות על Audit Trail, אחידות בין מדורים, Scope Churn, תלויות חיצוניות והתנגדות ארגונית'
  },
  { 
    number: 8, 
    label: 'Best Practices וצעדי המשך',
    description: 'שאלות על Best Practices, פיילוט, תבניות אחידות, Workflow של Review/Approval ותוצרים נדרשים'
  },
];

const CreateInterviewModal = ({ onClose, onSubmit }: CreateInterviewModalProps) => {
  const [managerName, setManagerName] = useState('');
  const [managerRole, setManagerRole] = useState('');
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(true);
  const [availableTopics, setAvailableTopics] = useState<typeof TOPICS>([]);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setIsLoadingChallenges(true);
        const data = await challengesAPI.list();
        setChallenges(data);
      } catch (error) {
        console.error('Error loading challenges:', error);
        alert('שגיאה בטעינת אתגרים');
      } finally {
        setIsLoadingChallenges(false);
      }
    };
    loadChallenges();
  }, []);

  useEffect(() => {
    if (selectedChallengeId) {
      const challenge = challenges.find((c) => c._id === selectedChallengeId);
      if (challenge) {
        // Filter topics to only show those in the challenge
        const challengeTopics = TOPICS.filter((topic) =>
          challenge.topicNumbers.includes(topic.number)
        );
        setAvailableTopics(challengeTopics);
        // Reset selected topics when challenge changes
        setSelectedTopics([]);
      }
    } else {
      setAvailableTopics([]);
      setSelectedTopics([]);
    }
  }, [selectedChallengeId, challenges]);

  const handleChallengeChange = (challengeId: string) => {
    setSelectedChallengeId(challengeId);
  };

  const handleTopicToggle = (topicNumber: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicNumber)
        ? prev.filter((t) => t !== topicNumber)
        : [...prev, topicNumber]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerName) {
      alert('נא למלא שם מנהל');
      return;
    }
    if (!selectedChallengeId) {
      alert('נא לבחור אתגר');
      return;
    }
    if (selectedTopics.length === 0) {
      alert('נא לבחור לפחות נושא אחד');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        managerName,
        managerRole: managerRole || undefined,
        selectedTopics,
        challengeId: selectedChallengeId,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>יצירת ריאיון חדש</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>שם מנהל *</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>תפקיד (אופציונלי)</label>
            <input
              type="text"
              value={managerRole}
              onChange={(e) => setManagerRole(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label>אתגר *</label>
            {isLoadingChallenges ? (
              <div>טוען אתגרים...</div>
            ) : challenges.length === 0 ? (
              <div style={{ color: '#999', padding: '10px' }}>
                אין אתגרים זמינים. נא ליצור אתגר תחילה.
              </div>
            ) : (
              <select
                value={selectedChallengeId}
                onChange={(e) => handleChallengeChange(e.target.value)}
                required
                disabled={isSubmitting}
                style={{ width: '100%', padding: '8px', fontSize: '14px' }}
              >
                <option value="">בחר אתגר</option>
                {challenges.map((challenge) => (
                  <option key={challenge._id} value={challenge._id}>
                    {challenge.name}
                  </option>
                ))}
              </select>
            )}
            {selectedChallengeId && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {challenges.find((c) => c._id === selectedChallengeId)?.description}
              </div>
            )}
          </div>

          {selectedChallengeId && (
            <div className="form-group">
              <label>נושאים *</label>
              {availableTopics.length === 0 ? (
                <div style={{ color: '#999', padding: '10px' }}>
                  אין נושאים זמינים לאתגר זה
                </div>
              ) : (
                <div className="topics-grid">
                  {availableTopics.map((topic) => (
                    <label key={topic.number} className="topic-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedTopics.includes(topic.number)}
                        onChange={() => handleTopicToggle(topic.number)}
                        disabled={isSubmitting}
                      />
                      <div className="topic-content">
                        <span className="topic-label">
                          נושא {topic.number}: {topic.label}
                        </span>
                        <span className="topic-description">{topic.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              ביטול
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'יוצר...' : 'צור ריאיון'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInterviewModal;

