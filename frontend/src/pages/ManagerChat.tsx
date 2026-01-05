import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { managerAPI } from '../services/api';
import ChatThread from '../components/ChatThread';
import QuickReplies from '../components/QuickReplies';
import TopicHeader from '../components/TopicHeader';
import ProgressBar from '../components/ProgressBar';
import './ManagerChat.css';

interface ChatState {
  interview: any;
  currentTopic: number;
  nextQuestion: string;
  messages: Array<{ role: string; content: string; createdAt?: string }>;
  topicConfidence: number;
  coveredPoints: string[];
  quickReplies: string[];
  status: 'init' | 'asking' | 'waiting' | 'finished';
  progress: {
    answered: number;
    skipped: number;
    total: number;
  };
}

const ManagerChat = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [state, setState] = useState<ChatState | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (shareToken) {
      loadState();
    }
  }, [shareToken]);

  useEffect(() => {
    scrollToBottom();
  }, [state?.messages]);

  // Also scroll when state changes (including when bot sends message)
  useEffect(() => {
    if (state) {
      // Use setTimeout to ensure DOM is updated before scrolling
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadState = async () => {
    try {
      setIsLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ManagerChat.tsx:59',message:'loadState entry',data:{shareToken},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const data = await managerAPI.getState(shareToken!);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ManagerChat.tsx:63',message:'State API response received',data:{hasData:!!data,recentMessagesCount:data?.recent_messages?.length||0,hasNextQuestionText:!!data?.current?.next_question_text,nextQuestionText:data?.current?.next_question_text?.substring(0,50),currentTopic:data?.current?.topic_number,interviewStatus:data?.interview?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Prepare initial messages - if no messages exist and there's a first question, add it
      let initialMessages = data.recent_messages || [];
      if (initialMessages.length === 0 && data.current.next_question_text) {
        initialMessages = [{ role: 'bot', content: data.current.next_question_text }];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ManagerChat.tsx:67',message:'Added initial message from next_question_text',data:{initialMessagesCount:initialMessages.length,nextQuestionText:data.current.next_question_text.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/dc096220-6349-42a2-b26a-2a102f66ca5d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'ManagerChat.tsx:70',message:'Final state being set',data:{initialMessagesCount:initialMessages.length,currentTopic:data.current.topic_number,hasNextQuestion:!!data.current.next_question_text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      setState({
        interview: data.interview,
        currentTopic: data.current.topic_number,
        nextQuestion: data.current.next_question_text,
        messages: initialMessages,
        topicConfidence: data.topic_state?.[0]?.confidence || 0,
        coveredPoints: data.topic_state?.[0]?.covered_points || [],
        quickReplies: ['המשך', 'דלג', 'לא יודע', 'עצור'],
        status: data.interview.status === 'completed' ? 'finished' : 'asking',
        progress: data.progress || { answered: 0, skipped: 0, total: 0 },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בטעינת הריאיון');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string, action: string = 'answer') => {
    if (!shareToken || !state) return;

    try {
      setIsLoading(true);
      setError('');

      // Add user message to UI
      const updatedMessages = [...state.messages, { role: 'manager', content: message }];
      setState({
        ...state,
        messages: updatedMessages,
        status: 'waiting',
      });

      const response = await managerAPI.postMessage(shareToken, message, action);

      // Update state with bot response
      setState({
        ...state,
        messages: [
          ...updatedMessages,
          { role: 'bot', content: response.bot_message },
        ],
        currentTopic: response.topic_number,
        nextQuestion: response.next_question_text || '',
        topicConfidence: response.topic_confidence,
        coveredPoints: response.covered_points || [],
        quickReplies: response.quick_replies || [],
        status: response.next_action === 'END' ? 'finished' : 'asking',
        progress: response.progress || state.progress,
      });

      setInputMessage('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בשליחת הודעה');
      setState({
        ...state,
        status: 'asking',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (action: string) => {
    const actionMap: Record<string, string> = {
      המשך: 'answer',
      דלג: 'skip',
      'לא יודע': 'skip',
      עצור: 'pause',
    };

    // Send the quick reply text as the message, not empty string
    // This ensures the answer is saved properly
    handleSendMessage(action, actionMap[action] || 'answer');
  };

  const handleComplete = async () => {
    if (!shareToken) return;

    try {
      await managerAPI.complete(shareToken);
      setState((prev) => (prev ? { ...prev, status: 'finished' } : null));
      alert('הריאיון הושלם בהצלחה!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'שגיאה בהשלמת הריאיון');
    }
  };

  if (isLoading && !state) {
    return (
      <div className="manager-chat">
        <div className="loading">טוען...</div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="manager-chat">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!state) {
    return <div className="manager-chat">לא נמצא ריאיון</div>;
  }

  return (
    <div className="manager-chat">
      <ProgressBar
        answered={state.progress.answered}
        skipped={state.progress.skipped}
        total={state.progress.total}
      />
      <TopicHeader
        topicNumber={state.currentTopic}
        confidence={state.topicConfidence}
        coveredPoints={state.coveredPoints}
      />

      <ChatThread messages={state.messages} />
      <div ref={messagesEndRef} />

      {state.status === 'finished' ? (
        <div className="finished-message">
          <h2>תודה! הריאיון הושלם</h2>
          <p>התשובות נשמרו ונשלחו למנהל הפרויקט</p>
        </div>
      ) : (
        <>
          <QuickReplies
            replies={state.quickReplies}
            onSelect={handleQuickAction}
            disabled={isLoading}
          />

          <div className="chat-input-container">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && !isLoading && inputMessage.trim()) {
                  e.preventDefault();
                  handleSendMessage(inputMessage.trim());
                }
              }}
              placeholder="הקלד תשובה מפורטת..."
              disabled={isLoading}
              className="chat-input"
              rows={4}
            />
            <div className="chat-buttons">
              <button
                onClick={() => {
                  if (inputMessage.trim()) {
                    handleSendMessage(inputMessage.trim());
                  }
                }}
                disabled={isLoading || !inputMessage.trim()}
                className="send-btn"
              >
                שלח
              </button>
              {state.status === 'asking' && (
                <button onClick={handleComplete} className="complete-btn">
                  סיים ריאיון
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
};

export default ManagerChat;

