import './TopicHeader.css';

interface TopicHeaderProps {
  topicNumber: number;
  confidence: number;
  coveredPoints: string[];
}

const TOPIC_LABELS: Record<number, string> = {
  1: 'תיאור האתגר והכאב המרכזי',
  2: 'השפעה עסקית ומיקודים ארגוניים',
  3: 'קהל יעד, היקף ותלותים',
  4: 'מדדים (KPI) והשפעה מדידה',
  5: 'מה נחשב הצלחה (ללא קשר ל-AI)',
  6: 'דאטה, כלים ותשתית תומכת',
  7: 'מורכבות, סיכונים ושינוי ארגוני',
  8: 'Best Practices וצעדי המשך',
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

