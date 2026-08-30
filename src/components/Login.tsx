import { useState } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import type { User } from '../types';
import { PMTBrandLogo } from './PMTBrandLogo';

interface LoginProps {
  onLogin: (user: User) => void;
  availableUsers: User[];
}

export const Login = ({ onLogin, availableUsers }: LoginProps) => {
  const [lineLoading, setLineLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('กรุณากรอกอีเมลและรหัสผ่าน / Please enter email and password');
      return;
    }
    setLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'การเข้าสู่ระบบล้มเหลว / Login failed');
      } else {
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
        }
        onLogin(data.user || data);
      }
    } catch (err) {
      console.error(err);
      setLoginError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ / Connection error');
    } finally {
      setLoading(false);
    }
  };

  // Parse error parameters from URL (e.g., if LINE Login failed or user is unauthorized)
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get('error');
  const errorEmail = params.get('email');

  const handleLineLogin = () => {
    setLineLoading(true);
    // Redirect browser to backend LINE OAuth route with current origin context
    const origin = window.location.origin;
    window.location.href = `/api/auth/line?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'var(--bg-primary)',
      zIndex: 9999,
      overflow: 'hidden'
    }}>
      {/* Background Lights */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(6, 199, 85, 0.15) 0%, transparent 70%)',
        top: '10%',
        left: '15%',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        bottom: '10%',
        right: '15%',
        pointerEvents: 'none'
      }} />

      <div className="glass-panel" style={{
        padding: '3rem 2.5rem',
        width: '450px',
        maxWidth: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        boxShadow: 'var(--shadow-glass)',
        position: 'relative'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', textAlign: 'center' }}>
          <PMTBrandLogo variant="full" size="md" />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem', fontWeight: 500 }}>ระบบบริหารจัดการโครงการติดตั้ง &amp; รีโนเวทบ้าน</p>
        </div>

        {errorParam && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            color: 'white',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
          }}>
            <strong style={{ color: '#ff6b6b' }}>
              ⚠️ ล็อกอินไม่สำเร็จ / Sign in Failed
            </strong>
            {errorParam === 'unauthorized' ? (
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                บัญชี LINE ของคุณยังไม่ได้ลงทะเบียนในระบบ {errorEmail && `(${errorEmail})`} กรุณาติดต่อ Admin เพื่อลงทะเบียนอีเมลของท่านก่อนเข้าใช้งานครั้งแรกครับ
              </p>
            ) : (
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                เกิดข้อผิดพลาด: {decodeURIComponent(errorParam)}
              </p>
            )}
          </div>
        )}

        {/* Authentication Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block', fontWeight: 500 }}>
                อีเมล / รหัสผู้ใช้งาน (เช่น bnagm, nwmgm หรือ Admin)
              </label>
              <input 
                type="text" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="เช่น bnagm หรือ isarachootip@gmail.com" 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.9rem',
                  transition: 'border-color var(--transition-fast)'
                }}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', display: 'block', fontWeight: 500 }}>Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.9rem',
                  transition: 'border-color var(--transition-fast)'
                }}
                required
              />
            </div>

            {loginError && (
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                {loginError}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                padding: '0.85rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                fontSize: '1rem',
                transition: 'all var(--transition-fast)',
                opacity: loading ? 0.7 : 1
              }}
              className="hover-lift"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            margin: '0.5rem 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
            <span style={{ padding: '0 0.75rem' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }} />
          </div>

          {/* LINE Login Button */}
          <button 
            onClick={handleLineLogin}
            disabled={lineLoading}
            style={{
              background: '#06C755',
              color: 'white',
              border: 'none',
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              width: '100%',
              fontSize: '1rem',
              transition: 'all var(--transition-fast)'
            }}
            className="hover-lift"
          >
            {lineLoading ? (
              <span>Connecting to LINE...</span>
            ) : (
              <>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', color: '#06C755', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>L</div>
                <span>Sign in with LINE OA</span>
              </>
            )}
          </button>
        </div>

        {/* Fast Switcher Section (For Demo Roles) - Localhost Only */}
        {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
              Or sign in with Demo Account (Dev Only)
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {availableUsers.slice(0, 3).map(user => (
                <div 
                  key={user.id} 
                  onClick={() => onLogin(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-lift"
                >
                  <img src={user.avatar} alt={user.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Shield size={10} color="var(--accent-primary)" />
                      <span>{user.globalRole} ({user.department})</span>
                    </div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
