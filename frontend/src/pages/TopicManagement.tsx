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
  const [formExampleQuestions, setFormExampleQuestions] = useState<string[]>(['']);
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
    setFormExampleQuestions(['']);
    setShowCreateModal(true);
  };

  const handleEdit = (topic: Topic) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:47',message:'handleEdit called',data:{topicId:topic._id,exampleQuestions:topic.exampleQuestions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    setEditingTopic(topic);
    setFormNumber(topic.number);
    setFormLabel(topic.label);
    setFormDescription(topic.description);
    setFormExampleQuestions(topic.exampleQuestions && topic.exampleQuestions.length > 0 ? topic.exampleQuestions : ['']);
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:69',message:'handleSubmit called',data:{formExampleQuestions:formExampleQuestions,length:formExampleQuestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    e.preventDefault();
    if (!formLabel || !formDescription || !formNumber || formNumber <= 0) {
      alert('נא למלא את כל השדות');
      return;
    }

    // Filter out empty example questions
    const exampleQuestions = formExampleQuestions.filter(q => q.trim().length > 0);

    setIsSubmitting(true);
    try {
      if (editingTopic) {
        await topicsAPI.update(editingTopic._id, {
          number: formNumber,
          label: formLabel,
          description: formDescription,
          exampleQuestions: exampleQuestions.length > 0 ? exampleQuestions : undefined,
        });
      } else {
        await topicsAPI.create({
          number: formNumber,
          label: formLabel,
          description: formDescription,
          exampleQuestions: exampleQuestions.length > 0 ? exampleQuestions : undefined,
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

  const handleAddExampleQuestion = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // #region agent log
    console.log('[DEBUG] handleAddExampleQuestion called', { currentState: formExampleQuestions, length: formExampleQuestions.length });
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:111',message:'handleAddExampleQuestion called',data:{currentState:formExampleQuestions,length:formExampleQuestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>console.error('[DEBUG] Log fetch error:',e));
    // #endregion
    const newQuestions = [...formExampleQuestions, ''];
    // #region agent log
    console.log('[DEBUG] handleAddExampleQuestion - new state', { newQuestions, length: newQuestions.length });
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:115',message:'handleAddExampleQuestion - new state',data:{newQuestions:newQuestions,length:newQuestions.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'A'})}).catch((e)=>console.error('[DEBUG] Log fetch error:',e));
    // #endregion
    setFormExampleQuestions(newQuestions);
  };

  const handleRemoveExampleQuestion = (index: number) => {
    setFormExampleQuestions((prev) => {
      if (prev.length > 1) {
        return prev.filter((_, i) => i !== index);
      }
      return prev;
    });
  };

  const handleExampleQuestionChange = (index: number, value: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:118',message:'handleExampleQuestionChange called',data:{index:index,value:value.substring(0,30),currentState:formExampleQuestions},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    setFormExampleQuestions((prev) => {
      const updated = [...prev];
      updated[index] = value;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:123',message:'handleExampleQuestionChange - state updated',data:{index:index,updatedState:updated,updatedLength:updated.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return updated;
    });
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
                  {topic.exampleQuestions && topic.exampleQuestions.length > 0 && (
                    <div className="topic-example-questions">
                      <strong>שאלות לדוגמא ({topic.exampleQuestions.length}):</strong>
                      <ul>
                        {topic.exampleQuestions.slice(0, 3).map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                        {topic.exampleQuestions.length > 3 && (
                          <li className="more-questions">ועוד {topic.exampleQuestions.length - 3} שאלות...</li>
                        )}
                      </ul>
                    </div>
                  )}
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

              <div className="form-group">
                <label>שאלות לדוגמא (אופציונלי)</label>
                <p className="form-hint">שאלות אלה ישמשו את ה-AI כהשראה בעת יצירת שאלות לאתגרים. השתמש בהן כדי להדריך את ה-AI על איזה סוג שאלות אתה מצפה.</p>
                <div className="example-questions-list">
                  {/* #region agent log */}
                  {(() => {
                    console.log('[DEBUG] Rendering example questions list', { formExampleQuestions, length: formExampleQuestions.length, questions: formExampleQuestions.map((q, i) => ({ index: i, value: q.substring(0, 20) })) });
                    fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'TopicManagement.tsx:247',message:'Rendering example questions list',data:{formExampleQuestions:formExampleQuestions,length:formExampleQuestions.length,questions:formExampleQuestions.map((q,i)=>({index:i,value:q.substring(0,20)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch((e)=>console.error('[DEBUG] Log fetch error:',e));
                    return null;
                  })()}
                  {/* #endregion */}
                  {formExampleQuestions.map((question, index) => (
                    <div key={`example-question-${index}`} className="example-question-item">
                      <textarea
                        value={question}
                        onChange={(e) => handleExampleQuestionChange(index, e.target.value)}
                        disabled={isSubmitting}
                        rows={2}
                        placeholder="הזן שאלה לדוגמא..."
                      />
                      {formExampleQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveExampleQuestion(index)}
                          disabled={isSubmitting}
                          className="btn-remove-question"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => handleAddExampleQuestion(e)}
                    disabled={isSubmitting}
                    className="btn-add-question"
                  >
                    + הוסף שאלה לדוגמא
                  </button>
                </div>
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

