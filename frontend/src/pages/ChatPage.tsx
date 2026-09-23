import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { apiChat } from '../api';
import type { ChatSource } from '../api';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ChatPage() {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSend() {
    const question = input.trim();
    if (!question || !token || loading) return;

    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const data = await apiChat(question, token);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to get an answer');
      setMessages((prev) => prev.slice(0, -1)); // Remove the user message on error
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            <div className="chat-empty-icon">✦</div>
            <p style={{ fontSize: '0.9rem' }}>Ask me anything about your journal entries.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              My answers are grounded strictly in what you've written.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            <div className="chat-bubble">{msg.content}</div>
            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="chat-sources">
                {msg.sources.map((src) => (
                  <span key={src.id} className="source-badge">
                    📄 {formatDate(src.created_at)} · {(src.similarity * 100).toFixed(0)}% match
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ alignSelf: 'flex-start', maxWidth: '85%' }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-row">
          <textarea
            id="chat-input"
            className="form-textarea"
            placeholder="Ask a question about your journal… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
            maxLength={2000}
          />
          <button
            id="btn-send-chat"
            className="btn btn-primary"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            title="Send (Enter)"
          >
            {loading ? <span className="spinner" /> : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}
