import './InterviewList.css';

interface Interview {
  _id: string;
  managerName: string;
  managerRole?: string;
  status: string;
  shareToken: string;
  createdAt: string;
}

interface InterviewListProps {
  interviews: Interview[];
  onSelect: (interview: Interview) => void;
  selectedId?: string;
  getStatusLabel: (status: string) => string;
  getStatusClass: (status: string) => string;
}

const InterviewList = ({
  interviews,
  onSelect,
  selectedId,
  getStatusLabel,
  getStatusClass,
}: InterviewListProps) => {
  const copyShareLink = (token: string) => {
    const url = `${window.location.origin}/i/${token}`;
    navigator.clipboard.writeText(url);
    alert('הלינק הועתק!');
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
          <div className="interview-meta">
            <span>{new Date(interview.createdAt).toLocaleDateString('he-IL')}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyShareLink(interview.shareToken);
              }}
              className="copy-link-btn"
            >
              העתק לינק
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InterviewList;

