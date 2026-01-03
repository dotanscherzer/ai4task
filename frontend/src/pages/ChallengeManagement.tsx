import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { challengesAPI } from '../services/api';
import { Challenge } from '../types';
import './ChallengeManagement.css';

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

const ChallengeManagement = () => {
  const { logout } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTopicNumbers, setFormTopicNumbers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadChallenges();
  }, []);

  const loadChallenges = async () => {
    try {
      setIsLoading(true);
      const data = await challengesAPI.list();
      setChallenges(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת האתגרים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingChallenge(null);
    setFormName('');
    setFormDescription('');
    setFormTopicNumbers([]);
    setShowCreateModal(true);
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setFormName(challenge.name);
    setFormDescription(challenge.description);
    setFormTopicNumbers(challenge.topicNumbers);
    setShowCreateModal(true);
  };

  const handleDelete = async (challengeId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את האתגר הזה?')) {
      return;
    }

    try {
      await challengesAPI.delete(challengeId);
      loadChallenges();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה במחיקת אתגר');
    }
  };

  const handleTopicToggle = (topicNumber: number) => {
    setFormTopicNumbers((prev) =>
      prev.includes(topicNumber)
        ? prev.filter((t) => t !== topicNumber)
        : [...prev, topicNumber]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formDescription || formTopicNumbers.length === 0) {
      alert('נא למלא את כל השדות ולבחור לפחות נושא אחד');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingChallenge) {
        await challengesAPI.update(editingChallenge._id, {
          name: formName,
          description: formDescription,
          topicNumbers: formTopicNumbers,
        });
      } else {
        await challengesAPI.create({
          name: formName,
          description: formDescription,
          topicNumbers: formTopicNumbers,
        });
      }
      setShowCreateModal(false);
      loadChallenges();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בשמירת אתגר');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTopicLabel = (topicNumber: number) => {
    const topic = TOPICS.find((t) => t.number === topicNumber);
    return topic ? `נושא ${topicNumber}: ${topic.label}` : `נושא ${topicNumber}`;
  };

  return (
    <div className="challenge-management">
      <header className="challenge-header">
        <h1>ניהול אתגרים</h1>
        <div className="header-actions">
          <a href="/admin" className="back-link">← חזרה לראיונות</a>
          <button onClick={logout} className="logout-btn">
            התנתק
          </button>
        </div>
      </header>

      <div className="challenge-content">
        {error && <div className="error-banner">{error}</div>}

        <div className="challenges-section">
          <div className="section-header">
            <h2>אתגרים</h2>
            <button onClick={handleCreate} className="btn-primary">
              + אתגר חדש
            </button>
          </div>

          {isLoading ? (
            <div className="loading">טוען...</div>
          ) : challenges.length === 0 ? (
            <div className="empty-state">אין אתגרים עדיין</div>
          ) : (
            <div className="challenges-list">
              {challenges.map((challenge) => (
                <div key={challenge._id} className="challenge-card">
                  <div className="challenge-header-card">
                    <h3>{challenge.name}</h3>
                    <div className="challenge-actions">
                      <button
                        onClick={() => handleEdit(challenge)}
                        className="btn-edit"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => handleDelete(challenge._id)}
                        className="btn-delete"
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                  <p className="challenge-description">{challenge.description}</p>
                  <div className="challenge-topics">
                    <strong>נושאים:</strong>
                    <div className="topics-tags">
                      {challenge.topicNumbers.map((topicNum) => (
                        <span key={topicNum} className="topic-tag">
                          {getTopicLabel(topicNum)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingChallenge ? 'עריכת אתגר' : 'יצירת אתגר חדש'}</h2>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>שם האתגר *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>תיאור *</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>נושאים *</label>
                <div className="topics-grid">
                  {TOPICS.map((topic) => (
                    <label key={topic.number} className="topic-checkbox">
                      <input
                        type="checkbox"
                        checked={formTopicNumbers.includes(topic.number)}
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
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  ביטול
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'שומר...' : editingChallenge ? 'עדכן' : 'צור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChallengeManagement;

