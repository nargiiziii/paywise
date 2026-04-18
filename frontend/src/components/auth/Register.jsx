import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const pwStrength = (pw) => {
  if (!pw) return null;
  if (pw.length < 6) return 'weak';
  if (pw.length < 10 || !/[0-9]/.test(pw)) return 'medium';
  return 'strong';
};

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const onChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name required';
    if (!form.email) e.email = 'Email required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password required';
    else if (form.password.length < 6) e.password = 'Min 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    if (!agreed) e.agreed = 'Please accept the terms';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('🎉 Welcome to PayWise! $1,000 bonus added!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  const strength = pwStrength(form.password);

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-logo">
          <div className="logo-mark" style={{ width: 44, height: 44, fontSize: 22 }}>💳</div>
          <div className="logo-name" style={{ fontSize: 24 }}>Pay<span>Wise</span></div>
        </div>
        <h1 className="auth-left-headline">
          Join <span className="hl">50,000+</span><br />smart savers
        </h1>
        <p className="auth-left-sub">
          Open your free account in under 2 minutes and start managing your finances smarter.
        </p>
        <div style={{ marginTop: 48, position: 'relative', zIndex: 1 }}>
          {[
            { num: '$2.4M+', lbl: 'Transferred daily' },
            { num: '99.9%', lbl: 'Uptime SLA' },
            { num: '256-bit', lbl: 'AES Encryption' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--teal)', minWidth: 80 }}>{s.num}</div>
              <div style={{ fontSize: 14, color: 'var(--text-1)' }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <h2 className="auth-box-title">Create Account</h2>
          <p className="auth-box-sub">Get started with a $1,000 welcome bonus 🎁</p>

          <form onSubmit={submit}>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className={`form-input ${errors.name ? 'error' : ''}`} name="name" value={form.name} onChange={onChange} placeholder="Alex Johnson" autoComplete="name" />
                {errors.name && <div className="form-error">⚠ {errors.name}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone (optional)</label>
                <input className="form-input" name="phone" value={form.phone} onChange={onChange} placeholder="+1 555-0100" type="tel" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className={`form-input ${errors.email ? 'error' : ''}`} name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" autoComplete="email" />
              {errors.email && <div className="form-error">⚠ {errors.email}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrap">
                <input className={`form-input ${errors.password ? 'error' : ''}`} name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={onChange} placeholder="Min 6 characters" autoComplete="new-password" style={{ paddingRight: 44 }} />
                <button type="button" className="input-suffix" style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16 }} onClick={() => setShowPw(p => !p)}>{showPw ? '🙈' : '👁'}</button>
              </div>
              {strength && <div className={`pw-strength ${strength}`} />}
              {strength && <div style={{ fontSize: 11, color: strength === 'strong' ? 'var(--green)' : strength === 'medium' ? 'var(--yellow)' : 'var(--red)', marginTop: 3 }}>
                {strength === 'strong' ? '✓ Strong password' : strength === 'medium' ? '△ Add numbers for stronger password' : '✗ Too weak'}
              </div>}
              {errors.password && <div className="form-error">⚠ {errors.password}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className={`form-input ${errors.confirm ? 'error' : ''}`} name="confirm" type="password" value={form.confirm} onChange={onChange} placeholder="Repeat your password" autoComplete="new-password" />
              {errors.confirm && <div className="form-error">⚠ {errors.confirm}</div>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <label className="toggle">
                <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(p => ({...p, agreed: null})); }} />
                <span className="toggle-slider" />
              </label>
              <span style={{ fontSize: 13, color: 'var(--text-1)' }}>I agree to the <span style={{ color: 'var(--teal)', cursor: 'pointer' }}>Terms of Service</span> and <span style={{ color: 'var(--teal)', cursor: 'pointer' }}>Privacy Policy</span></span>
            </div>
            {errors.agreed && <div className="form-error" style={{ marginTop: -10, marginBottom: 14 }}>⚠ {errors.agreed}</div>}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><div className="spinner" style={{ borderTopColor: 'var(--bg-0)', borderColor: 'rgba(6,13,18,0.3)' }} /> Creating account...</> : 'Create Free Account →'}
            </button>
          </form>

          <div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div>
        </div>
      </div>
    </div>
  );
};

export default Register;
