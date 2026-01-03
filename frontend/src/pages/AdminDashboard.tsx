import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { interviewsAPI, emailAPI } from '../services/api';
import InterviewList from '../components/InterviewList';
import CreateInterviewModal from '../components/CreateInterviewModal';
import InterviewDetails from '../components/InterviewDetails';
import { Interview } from '../types';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInterviews();
  }, []);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const data = await interviewsAPI.list();
      setInterviews(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת הראיונות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInterview = async (data: any) => {
    try {
      await interviewsAPI.create(data);
      setShowCreateModal(false);
      loadInterviews();
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה ביצירת ריאיון');
    }
  };

  const handleSendEmail = async (interviewId: string) => {
    try {
      await emailAPI.send(interviewId);
      alert('המייל נשלח בהצלחה!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בשליחת מייל');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: 'לא התחיל',
      in_progress: 'בתהליך',
      completed: 'הושלם',
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      not_started: 'status-not-started',
      in_progress: 'status-in-progress',
      completed: 'status-completed',
    };
    return classes[status] || '';
  };

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>לוח בקרה - ראיונות AI</h1>
        <div className="header-actions">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="logout-btn">
            התנתק
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {error && <div className="error-banner">{error}</div>}

        <div className="dashboard-main">
          <div className="interviews-section">
            <div className="section-header">
              <h2>ראיונות</h2>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                + ריאיון חדש
              </button>
            </div>

            {isLoading ? (
              <div className="loading">טוען...</div>
            ) : interviews.length === 0 ? (
              <div className="empty-state">אין ראיונות עדיין</div>
            ) : (
              <InterviewList
                interviews={interviews}
                onSelect={(interview) => setSelectedInterview(interview)}
                selectedId={selectedInterview?._id}
                getStatusLabel={getStatusLabel}
                getStatusClass={getStatusClass}
              />
            )}
          </div>

          {selectedInterview && (
            <div className="details-section">
              <InterviewDetails
                interview={selectedInterview}
                onSendEmail={handleSendEmail}
                onClose={() => setSelectedInterview(null)}
              />
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateInterviewModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateInterview}
        />
      )}
    </div>
  );
};

export default AdminDashboard;

