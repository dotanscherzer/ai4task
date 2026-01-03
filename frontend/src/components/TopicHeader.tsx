import './TopicHeader.css';

interface TopicHeaderProps {
  topicNumber: number;
  confidence: number;
  coveredPoints: string[];
}

const TOPIC_LABELS: Record<number, string> = {
  1: 'הבנת מבנה HLD',
  2: 'הגדרת Epic',
  3: 'פירוק ל-Features',
  4: 'יצירת Stories',
  5: 'עקביות בין מדורים',
  6: 'הערכה ותכנון',
  7: 'תלויות וסיכונים',
  8: 'כלים ותהליכים',
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

