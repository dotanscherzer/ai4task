import { useState } from 'react';
import './CreateInterviewModal.css';

interface CreateInterviewModalProps {
  onClose: () => void;
  onSubmit: (data: {
    managerName: string;
    managerRole?: string;
    adminEmail?: string;
    selectedTopics: number[];
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
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTopicToggle = (topicNumber: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicNumber)
        ? prev.filter((t) => t !== topicNumber)
        : [...prev, topicNumber]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerName || selectedTopics.length === 0) {
      alert('נא למלא שם מנהל ולבחור לפחות נושא אחד');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        managerName,
        managerRole: managerRole || undefined,
        selectedTopics,
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
            <label>נושאים *</label>
            <div className="topics-grid">
              {TOPICS.map((topic) => (
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
          </div>

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

