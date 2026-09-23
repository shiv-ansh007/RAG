import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import JournalPage from './pages/JournalPage';
import ChatPage from './pages/ChatPage';

type Page = 'journal' | 'chat';

export default function App() {
  const { token, user, logout } = useAuth();
  const [page, setPage] = useState<Page>('journal');

  // Not authenticated — show auth page
  if (!token || !user) {
    return <AuthPage />;
  }

  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="navbar-brand-icon">✦</div>
          AI Journal
        </div>
        <div className="navbar-user">
          <span className="navbar-email">{user.email}</span>
          <button
            id="btn-logout"
            className="btn btn-secondary btn-sm"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main layout: sidebar + content */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <button
            id="nav-journal"
            className={`nav-item ${page === 'journal' ? 'active' : ''}`}
            onClick={() => setPage('journal')}
          >
            <span className="nav-item-icon">📔</span>
            Journal
          </button>
          <button
            id="nav-chat"
            className={`nav-item ${page === 'chat' ? 'active' : ''}`}
            onClick={() => setPage('chat')}
          >
            <span className="nav-item-icon">✦</span>
            AI Chat
          </button>
          <div className="divider" style={{ margin: '8px 4px' }} />
          <div style={{
            padding: '12px 14px',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            lineHeight: '1.5',
          }}>
            Your AI assistant can only see <strong style={{ color: 'var(--text-secondary)' }}>your</strong> journal entries.
          </div>
        </aside>

        {/* Page content */}
        {page === 'journal' ? <JournalPage /> : <ChatPage />}
      </div>
    </div>
  );
}
