import { useState } from 'react';
import type { FormEvent } from 'react';
import { apiLogin, apiRegister } from '../api';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const fn = tab === 'login' ? apiLogin : apiRegister;
      const data = await fn(email, password);
      login(data.token, data.user);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">✦</div>
          <h1>AI Journal</h1>
          <p>Your private AI-powered memory companion</p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs" role="tablist">
          <button
            id="tab-login"
            role="tab"
            className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
            aria-selected={tab === 'login'}
          >
            Sign In
          </button>
          <button
            id="tab-register"
            role="tab"
            className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
            aria-selected={tab === 'register'}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <div className="card">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder={tab === 'register' ? 'At least 8 characters' : '••••••••'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                minLength={tab === 'register' ? 8 : undefined}
              />
            </div>

            {error && (
              <div className="alert alert-error" role="alert">{error}</div>
            )}

            <button
              id={`btn-${tab}`}
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" /> {tab === 'login' ? 'Signing in…' : 'Creating account…'}</>
                : tab === 'login' ? 'Sign In' : 'Create Account'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
