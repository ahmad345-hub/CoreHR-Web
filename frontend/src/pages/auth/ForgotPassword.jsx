import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api/client'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [form, setForm]       = useState({ username: '', email: '', new_password: '', confirm_password: '' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    if (form.new_password !== form.confirm_password) {
      return setError('Passwords do not match')
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        username: form.username,
        email: form.email,
        new_password: form.new_password,
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">C</div>
          <div>
            <div className="login-logo-name">CoreHR</div>
            <div className="login-logo-sub">HR Management System</div>
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ marginBottom: 8 }}>Password Reset!</h2>
            <p style={{ color: 'var(--t-muted)', marginBottom: 24 }}>
              Your password has been updated. Redirecting to login…
            </p>
            <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.65rem' }}>
              Go to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="login-title">Reset Password</h1>
            <p className="login-subtitle">Enter your username and registered email to verify your identity.</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="your.username"
                  value={form.username}
                  onChange={e => f('username', e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => f('email', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={form.new_password}
                  onChange={e => f('new_password', e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={form.confirm_password}
                  onChange={e => f('confirm_password', e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '0.65rem', marginTop: 8 }}
                disabled={loading}
              >
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Link to="/login" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
                ← Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
