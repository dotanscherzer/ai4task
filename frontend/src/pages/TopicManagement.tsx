import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { topicsAPI } from '../services/api';
import { Topic } from '../types';
import './TopicManagement.css';

const TopicManagement = () => {
  const { logout } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  
  // Form state
  const [formNumber, setFormNumber] = useState<number>(1);
  const [formLabel, setFormLabel] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setIsLoading(true);
      const data = await topicsAPI.list();
      setTopics(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת הנושאים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTopic(null);
    setFormNumber(1);
    setFormLabel('');
    setFormDescription('');
    setShowCreateModal(true);
  };

  const handleEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormNumber(topic.number);
    setFormLabel(topic.label);
    setFormDescription(topic.description);
    setShowCreateModal(true);
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הנושא הזה?')) {
      return;
    }

    try {
      await topicsAPI.delete(topicId);
      loadTopics();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה במחיקת נושא');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel || !formDescription || !formNumber || formNumber <= 0) {
      alert('נא למלא את כל השדות');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTopic) {
        await topicsAPI.update(editingTopic._id, {
          number: formNumber,
          label: formLabel,
          description: formDescription,
        });
      } else {
        await topicsAPI.create({
          number: formNumber,
          label: formLabel,
          description: formDescription,
        });
      }
      setShowCreateModal(false);
      loadTopics();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בשמירת נושא');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="topic-management">
      <header className="topic-header">
        <h1>ניהול נושאים</h1>
        <div className="header-actions">
          <a href="/admin" className="back-link">← חזרה לראיונות</a>
          <button onClick={logout} className="logout-btn">
            התנתק
          </button>
        </div>
      </header>

      <div className="topic-content">
        {error && <div className="error-banner">{error}</div>}

        <div className="topics-section">
          <div className="section-header">
            <h2>נושאים</h2>
            <button onClick={handleCreate} className="btn-primary">
              + נושא חדש
            </button>
          </div>

          {isLoading ? (
            <div className="loading">טוען...</div>
          ) : topics.length === 0 ? (
            <div className="empty-state">אין נושאים עדיין</div>
          ) : (
            <div className="topics-list">
              {topics.map((topic) => (
                <div key={topic._id} className="topic-card">
                  <div className="topic-header-card">
                    <h3>נושא {topic.number}: {topic.label}</h3>
                    <div className="topic-actions">
                      <button
                        onClick={() => handleEdit(topic)}
                        className="btn-edit"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => handleDelete(topic._id)}
                        className="btn-delete"
                      >
                        מחק
                      </button>
                    </div>
                  </div>
                  <p className="topic-description">{topic.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTopic ? 'עריכת נושא' : 'יצירת נושא חדש'}</h2>
              <button
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>מספר נושא *</label>
                <input
                  type="number"
                  min="1"
                  value={formNumber}
                  onChange={(e) => setFormNumber(parseInt(e.target.value, 10) || 1)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>כותרת *</label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="form-group">
                <label>תיאור *</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                  disabled={isSubmitting}
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  ביטול
                </button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'שומר...' : editingTopic ? 'עדכן' : 'צור'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicManagement;

