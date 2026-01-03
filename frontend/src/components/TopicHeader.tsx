import './TopicHeader.css';

interface TopicHeaderProps {
  topicNumber: number;
  confidence: number;
  coveredPoints: string[];
}

const TOPIC_LABELS: Record<number, string> = {
  1: 'הבנת מבנה HLD - רכיבים עיקריים ומבנה טיפוסי',
  2: 'הגדרת Epic - קריטריונים ומספר טיפוסי',
  3: 'פירוק Epic ל-Features - גודל ומספר',
  4: 'יצירת Stories מ-Features - קריטריונים ומספר',
  5: 'עקביות בין מדורים - אתגרים וכלים',
  6: 'הערכה ותכנון - תהליך וטיפול באי-ודאות',
  7: 'תלויות וסיכונים - זיהוי וניהול',
  8: 'כלים ותהליכים - מפירוק HLD עד Stories',
};

const TopicHeader = ({ topicNumber, confidence, coveredPoints }: TopicHeaderProps) => {
  return (
    <div className="topic-header">
      <div className="topic-info">
        <h2>נושא {topicNumber}: {TOPIC_LABELS[topicNumber] || 'נושא כללי'}</h2>
        <div className="confidence-bar">
          <div className="confidence-label">ביטחון: {(confidence * 100).toFixed(0)}%</div>
          <div className="confidence-progress">
            <div
              className="confidence-fill"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      </div>
      {coveredPoints.length > 0 && (
        <div className="covered-points">
          <strong>מה למדנו:</strong>
          <ul>
            {coveredPoints.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TopicHeader;

