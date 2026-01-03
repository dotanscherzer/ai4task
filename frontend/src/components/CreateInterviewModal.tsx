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
    label: 'הבנת מבנה HLD - רכיבים עיקריים ומבנה טיפוסי',
    description: 'שאלות על הגדרת HLD בפרויקט, המבנה הטיפוסי והרכיבים העיקריים'
  },
  { 
    number: 2, 
    label: 'הגדרת Epic - קריטריונים ומספר טיפוסי',
    description: 'שאלות על איך מגדירים Epic, הקריטריונים להגדרת Epic חדש ומספר Epics טיפוסי בפרויקט'
  },
  { 
    number: 3, 
    label: 'פירוק Epic ל-Features - גודל ומספר',
    description: 'שאלות על תהליך הפירוק ל-Features, הגודל הטיפוסי של Feature ומספר Features ל-Epic'
  },
  { 
    number: 4, 
    label: 'יצירת Stories מ-Features - קריטריונים ומספר',
    description: 'שאלות על יצירת Stories, הקריטריונים ל-Story טוב ומספר Stories טיפוסי ב-Feature'
  },
  { 
    number: 5, 
    label: 'עקביות בין מדורים - אתגרים וכלים',
    description: 'שאלות על שמירה על עקביות בין מדורים שונים, האתגרים והכלים/תהליכים התומכים'
  },
  { 
    number: 6, 
    label: 'הערכה ותכנון - תהליך וטיפול באי-ודאות',
    description: 'שאלות על הערכת Epics ו-Features, תהליך התכנון מ-HLD וטיפול באי-ודאות'
  },
  { 
    number: 7, 
    label: 'תלויות וסיכונים - זיהוי וניהול',
    description: 'שאלות על טיפול בתלויות בין Epics/Features, הסיכונים העיקריים וניהולם'
  },
  { 
    number: 8, 
    label: 'כלים ותהליכים - מפירוק HLD עד Stories',
    description: 'שאלות על הכלים המשמשים לפירוק HLD, התהליך מ-HLD עד Stories ותיעוד'
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

