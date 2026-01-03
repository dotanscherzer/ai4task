import './ProgressBar.css';

interface ProgressBarProps {
  answered: number;
  skipped: number;
  total: number;
}

const ProgressBar = ({ answered, skipped, total }: ProgressBarProps) => {
  if (total === 0) {
    return null;
  }

  const totalAnswered = answered + skipped;
  const percentage = total > 0 ? Math.round((totalAnswered / total) * 100) : 0;

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-header">
        <span className="progress-bar-label">
          {totalAnswered} מתוך {total} שאלות
        </span>
        <span className="progress-bar-percentage">{percentage}%</span>
      </div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

