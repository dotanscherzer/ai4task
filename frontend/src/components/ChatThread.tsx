import './ChatThread.css';

interface Message {
  role: string;
  content: string;
  createdAt?: string;
}

interface ChatThreadProps {
  messages: Message[];
}

const ChatThread = ({ messages }: ChatThreadProps) => {
  return (
    <div className="chat-thread">
      {messages.length === 0 ? (
        <div className="empty-thread">אין הודעות עדיין</div>
      ) : (
        messages.map((message, idx) => (
          <div key={idx} className={`message ${message.role}`}>
            <div className="message-content">{message.content}</div>
            {message.createdAt && (
              <div className="message-time">
                {new Date(message.createdAt).toLocaleTimeString('he-IL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ChatThread;

