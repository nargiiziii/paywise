import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const DEMO = [
  { label: '🧑 Alex', email: 'alex@paywise.com', desc: '$24,750' },
  { label: '👩 Sofia', email: 'sofia@paywise.com', desc: '$8,320' },
  { label: '🧔 James', email: 'james@paywise.com', desc: '$52,100' },
];

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 👋');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const fillDemo = (email) => {
    setForm({ email, password: 'password123' });
    setErrors({});
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-logo">
          <div className="logo-mark" style={{ width: 44, height: 44, fontSize: 22 }}>💳</div>
          <div className="logo-name" style={{ fontSize: 24 }}>Pay<span>Wise</span></div>
        </div>
        <h1 className="auth-left-headline">
          Banking that<br />
          <span className="hl">works for you</span>
        </h1>
        <p className="auth-left-sub">
          Manage your money, track spending, set savings goals — all in one beautifully designed platform.
        </p>
        <div className="auth-features">
          {[
            { icon: '🔐', title: 'Bank-grade security', desc: 'JWT auth + bcrypt encryption' },
            { icon: '↗', title: 'Instant transfers', desc: 'Send money in seconds' },
            { icon: '🪙', title: 'Savings goals', desc: 'Track your financial targets' },
            { icon: '📊', title: 'Smart analytics', desc: 'Visual spending insights' },
          ].map((f, i) => (
            <div className="auth-feature" key={i}>
              <div className="auth-feature-icon">{f.icon}</div>
              <div className="auth-feature-text"><strong>{f.title}</strong> — {f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-box">
          <h2 className="auth-box-title">Sign In</h2>
          <p className="auth-box-sub">Enter your credentials to access your account</p>

          {/* Demo accounts */}
          <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--teal-dim)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-md)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 10 }}>
              🧪 Demo Accounts — password: password123
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DEMO.map(d => (
                <button key={d.email} onClick={() => fillDemo(d.email)}
                  style={{ padding: '5px 12px', background: 'var(--bg-0)', border: '1px solid var(--border-1)', borderRadius: 'var(--r-sm)', color: 'var(--text-1)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--teal)'; e.target.style.color = 'var(--teal)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border-1)'; e.target.style.color = 'var(--text-1)'; }}
                >
                  {d.label} <span style={{ color: 'var(--amber)' }}>{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className={`form-input ${errors.email ? 'error' : ''}`}
                name="email" type="email" value={form.email}
                onChange={onChange} placeholder="you@example.com" autoComplete="email"
              />
              {errors.email && <div className="form-error">⚠ {errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <input
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  name="password" type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={onChange} placeholder="••••••••" autoComplete="current-password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="input-suffix"
                  style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16, transform: 'none', top: '50%', translateY: '-50%' }}
                  onClick={() => setShowPw(p => !p)}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password && <div className="form-error">⚠ {errors.password}</div>}
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><div className="spinner" style={{ borderTopColor: 'var(--bg-0)', borderColor: 'rgba(6,13,18,0.3)' }} /> Signing in...</> : 'Sign In →'}
            </button>
          </form>

          <div className="auth-switch">Don't have an account? <Link to="/register">Create one free</Link></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
