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
  const [emailSending, setEmailSending] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string>('');
  const [emailSuccess, setEmailSuccess] = useState<string>('');

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
      setEmailSending(interviewId);
      setEmailError('');
      setEmailSuccess('');
      
      const response = await emailAPI.send(interviewId);
      
      setEmailSuccess(response.message || 'המייל נשלח בהצלחה!');
      setEmailError('');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setEmailSuccess('');
      }, 5000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'שגיאה בשליחת מייל';
      const errorDetails = err.response?.data?.details;
      
      setEmailError(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
      setEmailSuccess('');
      
      // Clear error message after 10 seconds
      setTimeout(() => {
        setEmailError('');
      }, 10000);
    } finally {
      setEmailSending(null);
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    try {
      await interviewsAPI.delete(interviewId);
      // If the deleted interview was selected, clear selection
      if (selectedInterview?._id === interviewId) {
        setSelectedInterview(null);
      }
      // Reload the list
      loadInterviews();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה במחיקת ריאיון');
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
        {emailError && (
          <div className="error-banner" style={{ backgroundColor: '#fee', color: '#c33', padding: '12px', marginBottom: '10px', borderRadius: '4px' }}>
            <strong>שגיאה בשליחת מייל:</strong> {emailError}
          </div>
        )}
        {emailSuccess && (
          <div className="success-banner" style={{ backgroundColor: '#efe', color: '#3c3', padding: '12px', marginBottom: '10px', borderRadius: '4px' }}>
            <strong>הצלחה:</strong> {emailSuccess}
          </div>
        )}

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
                onDelete={handleDeleteInterview}
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
                onClose={() => {
                  setSelectedInterview(null);
                  setEmailError('');
                  setEmailSuccess('');
                }}
                isSendingEmail={emailSending === selectedInterview._id}
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

