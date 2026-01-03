import './InterviewList.css';
import { Interview } from '../types';

interface InterviewListProps {
  interviews: Interview[];
  onSelect: (interview: Interview) => void;
  onDelete?: (interviewId: string) => void;
  selectedId?: string;
  getStatusLabel: (status: string) => string;
  getStatusClass: (status: string) => string;
}

const InterviewList = ({
  interviews,
  onSelect,
  onDelete,
  selectedId,
  getStatusLabel,
  getStatusClass,
}: InterviewListProps) => {
  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/i/${token}`;
    navigator.clipboard.writeText(url);
    alert('הלינק הועתק!');
  };

  const handleDelete = (e: React.MouseEvent, interviewId: string) => {
    e.stopPropagation();
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הריאיון הזה?')) {
      onDelete?.(interviewId);
    }
  };

  return (
    <div className="interview-list">
      {interviews.map((interview) => (
        <div
          key={interview._id}
          className={`interview-item ${selectedId === interview._id ? 'selected' : ''}`}
          onClick={() => onSelect(interview)}
        >
          <div className="interview-header">
            <h3>{interview.managerName}</h3>
            <span className={`status-badge ${getStatusClass(interview.status)}`}>
              {getStatusLabel(interview.status)}
            </span>
          </div>
          {interview.managerRole && (
            <div className="interview-role">{interview.managerRole}</div>
          )}
          {interview.challengeId && (
            <div className="interview-challenge">
              אתגר: {typeof interview.challengeId === 'object' ? interview.challengeId.name : 'טוען...'}
            </div>
          )}
          <div className="interview-meta">
            <span>{new Date(interview.createdAt).toLocaleDateString('he-IL')}</span>
            <div className="interview-actions">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyShareLink(interview.shareToken);
                }}
                className="copy-link-btn"
              >
                העתק לינק
              </button>
              {onDelete && (
                <button
                  onClick={(e) => handleDelete(e, interview._id)}
                  className="delete-btn"
                  title="מחק ריאיון"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InterviewList;

