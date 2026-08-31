import React, { useState } from 'react';
import { Eye, EyeOff, X, Check, Key, ShieldCheck, AlertCircle } from 'lucide-react';
import type { User } from '../types';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  targetUser?: User | null;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  targetUser
}) => {
  const userToUpdate = targetUser || currentUser;
  const isAdmin = (currentUser.globalRole as string) === 'Admin' || (currentUser.globalRole as string) === 'SuperAdmin' || currentUser.department === 'Management' || currentUser.email === 'isarachootip@gmail.com' || currentUser.email === 'chapirak@gmail.com' || currentUser.id === 'u_admin' || currentUser.id === 'u_chapirak';
  const isSelf = userToUpdate.id === currentUser.id;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleResetForm = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword.trim()) {
      setErrorMsg('กรุณากรอกรหัสผ่านใหม่');
      return;
    }

    if (newPassword.length < 4) {
      setErrorMsg('รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userToUpdate.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({ password: newPassword.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถเปลี่ยนรหัสผ่านได้');
      }

      setSuccessMsg(`เปลี่ยนรหัสผ่านของ "${userToUpdate.name}" สำเร็จเรียบร้อยแล้ว!`);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Password change error:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'var(--bg-secondary, #1e293b)',
        border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-primary, #0f172a)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              background: 'rgba(234, 88, 12, 0.15)',
              color: '#ea580c',
              padding: '0.45rem',
              borderRadius: '8px',
              display: 'flex'
            }}>
              <Key size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary, #f8fafc)' }}>
                {isSelf ? 'เปลี่ยนรหัสผ่านของคุณ' : `รีเซ็ตรหัสผ่าน: ${userToUpdate.name}`}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94a3b8)', marginTop: '0.1rem' }}>
                {userToUpdate.email} ({userToUpdate.globalRole || 'User'})
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary, #94a3b8)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {errorMsg && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#10b981',
              padding: '0.65rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.4rem' }}>
              รหัสผ่านใหม่ <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่..."
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 0.85rem',
                  background: 'var(--bg-primary, #0f172a)',
                  border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                  borderRadius: '8px',
                  color: 'var(--text-primary, #f8fafc)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary, #94a3b8)',
                  cursor: 'pointer',
                  display: 'flex'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', marginBottom: '0.4rem' }}>
              ยืนยันรหัสผ่านใหม่อีกครั้ง <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                background: 'var(--bg-primary, #0f172a)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.15))',
                borderRadius: '8px',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {isAdmin && (
            <div style={{
              fontSize: '0.75rem',
              color: '#059669',
              background: 'rgba(5, 150, 105, 0.08)',
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <ShieldCheck size={14} />
              <span>คุณมีสิทธิ์ Admin ในการเปลี่ยนรหัสผ่านนี้ได้ทันที</span>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, rgba(255,255,255,0.2))',
                background: 'transparent',
                color: 'var(--text-primary, #f8fafc)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.55rem 1.35rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                color: 'white',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(234, 88, 12, 0.4)'
              }}
            >
              {isSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกรหัสผ่านใหม่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
