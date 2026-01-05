import { useState, useEffect } from 'react';
import { challengesAPI, topicsAPI } from '../services/api';
import { Question, Challenge, Topic } from '../types';
import './ChallengeQuestionsModal.css';

interface ChallengeQuestionsModalProps {
  challenge: Challenge;
  onClose: () => void;
}

const ChallengeQuestionsModal = ({ challenge, onClose }: ChallengeQuestionsModalProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQuestionTopic, setNewQuestionTopic] = useState<number | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadQuestions();
    loadTopics();
  }, [challenge._id]);

  const loadTopics = async () => {
    try {
      const data = await topicsAPI.list();
      setTopics(data);
    } catch (err: any) {
      console.error('Error loading topics:', err);
    }
  };

  const loadQuestions = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await challengesAPI.getQuestions(challenge._id);
      setQuestions(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת השאלות');
    } finally {
      setIsLoading(false);
    }
  };

  const getTopicLabel = (topicNumber: number) => {
    const topic = topics.find((t) => t.number === topicNumber);
    return topic ? `נושא ${topicNumber}: ${topic.label}` : `נושא ${topicNumber}`;
  };

  const questionsByTopic = questions.reduce((acc, q) => {
    if (!acc[q.topicNumber]) {
      acc[q.topicNumber] = [];
    }
    acc[q.topicNumber].push(q);
    return acc;
  }, {} as Record<number, Question[]>);

  const handleEdit = (question: Question) => {
    setEditingQuestionId(question._id);
    setEditingText(question.questionText);
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setEditingText('');
  };

  const handleSaveEdit = async (questionId: string) => {
    if (!editingText.trim()) {
      alert('נא למלא טקסט שאלה');
      return;
    }

    try {
      setIsSaving(true);
      await challengesAPI.updateQuestion(challenge._id, questionId, editingText);
      await loadQuestions();
      setEditingQuestionId(null);
      setEditingText('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה בשמירת השאלה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את השאלה הזו?')) {
      return;
    }

    try {
      setIsSaving(true);
      await challengesAPI.deleteQuestion(challenge._id, questionId);
      await loadQuestions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה במחיקת השאלה');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestionTopic || !newQuestionText.trim()) {
      alert('נא למלא את כל השדות');
      return;
    }

    try {
      setIsSaving(true);
      await challengesAPI.createQuestion(challenge._id, {
        topicNumber: newQuestionTopic,
        questionText: newQuestionText,
      });
      await loadQuestions();
      setShowAddQuestion(false);
      setNewQuestionTopic(null);
      setNewQuestionText('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'שגיאה ביצירת השאלה');
    } finally {
      setIsSaving(false);
    }
  };

  const availableTopics = topics.filter((t) => challenge.topicNumbers.includes(t.number));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>ניהול שאלות - {challenge.name}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {isLoading ? (
          <div className="loading">טוען שאלות...</div>
        ) : (
          <>
            <div className="questions-by-topic">
              {challenge.topicNumbers.map((topicNumber) => {
                const topicQuestions = questionsByTopic[topicNumber] || [];
                return (
                  <div key={topicNumber} className="topic-section">
                    <h3 className="topic-section-title">{getTopicLabel(topicNumber)}</h3>
                    {topicQuestions.length === 0 ? (
                      <div className="empty-topic">אין שאלות לנושא זה</div>
                    ) : (
                      <div className="questions-list">
                        {topicQuestions.map((question) => (
                          <div key={question._id} className="question-item">
                            {editingQuestionId === question._id ? (
                              <div className="question-edit">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  disabled={isSaving}
                                  rows={3}
                                />
                                <div className="question-edit-actions">
                                  <button
                                    onClick={() => handleSaveEdit(question._id)}
                                    disabled={isSaving}
                                    className="btn-save"
                                  >
                                    שמור
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="btn-cancel"
                                  >
                                    ביטול
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="question-text">{question.questionText}</div>
                                <div className="question-actions">
                                  <button
                                    onClick={() => handleEdit(question)}
                                    className="btn-edit"
                                    disabled={isSaving}
                                  >
                                    ערוך
                                  </button>
                                  <button
                                    onClick={() => handleDelete(question._id)}
                                    className="btn-delete"
                                    disabled={isSaving}
                                  >
                                    מחק
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {showAddQuestion ? (
              <div className="add-question-form">
                <h3>הוסף שאלה חדשה</h3>
                <div className="form-group">
                  <label>נושא</label>
                  <select
                    value={newQuestionTopic || ''}
                    onChange={(e) => setNewQuestionTopic(Number(e.target.value))}
                    disabled={isSaving}
                  >
                    <option value="">בחר נושא</option>
                    {availableTopics.map((topic) => (
                      <option key={topic.number} value={topic.number}>
                        נושא {topic.number}: {topic.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>טקסט השאלה</label>
                  <textarea
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    disabled={isSaving}
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button
                    onClick={handleAddQuestion}
                    disabled={isSaving}
                    className="btn-primary"
                  >
                    הוסף
                  </button>
                  <button
                    onClick={() => {
                      setShowAddQuestion(false);
                      setNewQuestionTopic(null);
                      setNewQuestionText('');
                    }}
                    disabled={isSaving}
                    className="btn-cancel"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="modal-actions">
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className="btn-primary"
                  disabled={isSaving}
                >
                  + הוסף שאלה
                </button>
                <button onClick={onClose} className="btn-cancel" disabled={isSaving}>
                  סגור
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChallengeQuestionsModal;

