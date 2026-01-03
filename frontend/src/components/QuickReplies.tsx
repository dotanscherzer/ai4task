import './QuickReplies.css';

interface QuickRepliesProps {
  replies: string[];
  onSelect: (reply: string) => void;
  disabled?: boolean;
}

const QuickReplies = ({ replies, onSelect, disabled }: QuickRepliesProps) => {
  if (replies.length === 0) return null;

  return (
    <div className="quick-replies">
      {replies.map((reply, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className="quick-reply-btn"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};

export default QuickReplies;

