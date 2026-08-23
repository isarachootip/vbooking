import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import {
  X, Palette, CheckCircle2, AlertCircle, Clock, Plus,
  FileImage, ExternalLink, RefreshCw, Send, Check, MessageSquare, Layers
} from 'lucide-react';

interface LeadDesign {
  id: string;
  lead_id: string;
  designer_id?: string | null;
  designer_name?: string | null;
  designer_name_ref?: string | null;
  title: string;
  description?: string | null;
  version: string;
  design_type: string;
  file_urls: string[];
  status: 'Drafting' | 'Pending Customer Review' | 'Approved' | 'Revise Requested' | string;
  customer_feedback?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  created_by?: string | null;
}

interface DesignApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    job_type?: string;
    branch?: string;
  } | null;
  currentUser: User | null;
  users?: User[];
  onSaved?: () => void;
}

const DESIGN_TYPES = ['3D Perspective', '2D Floor Plan', 'Mood Board', 'Shop Drawing'];
const DESIGN_VERSIONS = ['Rev A', 'Rev B', 'Rev C', 'Rev D', 'Final'];

export const DesignApprovalModal: React.FC<DesignApprovalModalProps> = ({
  isOpen, onClose, lead, currentUser, users = [], onSaved
}) => {
  const [designs, setDesigns] = useState<LeadDesign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'new'>('list');

  // New Design Form states
  const [title, setTitle] = useState('แบบ 3D Perspective & ผังแปลน');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('Rev A');
  const [designType, setDesignType] = useState('3D Perspective');
  const [designerId, setDesignerId] = useState(currentUser?.id || '');
  const [fileUrlInput, setFileUrlInput] = useState('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);

  // Feedback / Approval form states
  const [feedbackInput, setFeedbackInput] = useState<{ [id: string]: string }>({});

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDesigns = async () => {
    if (!lead) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/designs`, {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setDesigns(data || []);
        if (data.length === 0) setActiveTab('new');
        else setActiveTab('list');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead) {
      fetchDesigns();
      setDesignerId(currentUser?.id || '');
      setTitle('แบบ 3D Perspective & ผังแปลน');
      setDescription('');
      setVersion('Rev A');
      setDesignType('3D Perspective');
      setFileUrls([]);
      setFileUrlInput('');
    }
  }, [isOpen, lead?.id]);

  const handleAddFileUrl = () => {
    if (!fileUrlInput.trim()) return;
    setFileUrls([...fileUrls, fileUrlInput.trim()]);
    setFileUrlInput('');
  };

  const handleRemoveFileUrl = (index: number) => {
    setFileUrls(fileUrls.filter((_, i) => i !== index));
  };

  const handleSubmitNewDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsSaving(true);
    const designer = users.find(u => u.id === designerId);
    try {
      const res = await fetch(`/api/leads/${lead.id}/designs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          designer_id: designerId || null,
          designer_name: designer?.name || currentUser?.name || 'Designer',
          title,
          description: description || null,
          version,
          design_type: designType,
          file_urls: fileUrls,
          status: 'Pending Customer Review',
          created_by: currentUser?.name || 'System'
        })
      });

      if (res.ok) {
        showToast('อัปโหลดแบบแปลน 2D/3D เรียบร้อยแล้ว!', 'success');
        await fetchDesigns();
        setActiveTab('list');
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateStatus = async (designId: string, newStatus: 'Approved' | 'Revise Requested') => {
    if (!lead) return;
    const fb = feedbackInput[designId] || '';
    try {
      const res = await fetch(`/api/leads/${lead.id}/designs/${designId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          status: newStatus,
          customer_feedback: fb || null,
          approved_by: currentUser?.name || 'Customer / PM'
        })
      });

      if (res.ok) {
        showToast(
          newStatus === 'Approved'
            ? '✅ ลูกค้าอนุมัติแบบแล้ว! ปลดล็อกสู่ขั้นตอนถอด BOQ'
            : '🔄 บันทึกขอแก้ไขแบบเรียบร้อยแล้ว',
          'success'
        );
        await fetchDesigns();
        onSaved?.();
      } else {
        showToast('ไม่สามารถอัปเดตสถานะได้', 'error');
      }
    } catch {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  if (!isOpen || !lead) return null;

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem',
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
    borderRadius: '8px', color: 'var(--text-primary)',
    fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text-secondary)', marginBottom: '0.35rem'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1500, padding: '1rem', overflowY: 'auto'
    }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 2000,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px',
          fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div style={{
        background: 'var(--bg-primary)', borderRadius: '16px',
        border: '1px solid var(--border-color)', width: '750px', maxWidth: '96vw',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', margin: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
          borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
              <Palette size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>
                จัดการแบบแปลน & ตรวจรับแบบ 2D/3D (Design & Space Planning)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                {lead.customer_name} · {lead.job_type || ''} {lead.branch ? '· ' + lead.branch : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            style={{
              flex: 1, padding: '0.75rem 1rem', border: 'none',
              background: activeTab === 'list' ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === 'list' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'list' ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer',
              borderBottom: activeTab === 'list' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            📋 รายการแบบแปลน ({designs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            style={{
              flex: 1, padding: '0.75rem 1rem', border: 'none',
              background: activeTab === 'new' ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === 'new' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'new' ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer',
              borderBottom: activeTab === 'new' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            + อัปโหลดแบบใหม่
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '72vh' }}>
          {activeTab === 'new' && (
            <form onSubmit={handleSubmitNewDesign} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ประเภทงานแบบแปลน *</label>
                  <select value={designType} onChange={e => setDesignType(e.target.value)} style={inp}>
                    {DESIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>เวอร์ชันแบบแปลน (Revision) *</label>
                  <select value={version} onChange={e => setVersion(e.target.value)} style={inp}>
                    {DESIGN_VERSIONS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>หัวข้อ / ชื่องานแบบ *</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="เช่น แบบ 3D Perspective ห้องครัวโมเดิร์น"
                  style={inp}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ผู้ออกแบบ (Designer / SA)</label>
                  {users.length > 0 ? (
                    <select value={designerId} onChange={e => setDesignerId(e.target.value)} style={inp}>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.globalRole || 'Designer'})</option>)}
                      <option value="">— ระบุชื่อภายนอก —</option>
                    </select>
                  ) : (
                    <input type="text" value={designerId} onChange={e => setDesignerId(e.target.value)} style={inp} />
                  )}
                </div>
              </div>

              <div>
                <label style={lbl}>รายละเอียดแนวคิด / คำอธิบายแบบ</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="เช่น สรุปการปรับผังทิศทางแสง, ปลั๊กไฟ, สีตู้ Built-in..."
                  rows={3}
                  style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
                />
              </div>

              {/* File URLs / Cloud storage attachment */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <label style={lbl}>ลิงก์รูปภาพ 3D / แบบแปลน PDF / Drive</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="url"
                    value={fileUrlInput}
                    onChange={e => setFileUrlInput(e.target.value)}
                    placeholder="https://images... หรือ https://drive.google.com/..."
                    style={inp}
                  />
                  <button
                    type="button"
                    onClick={handleAddFileUrl}
                    style={{
                      background: 'var(--accent-primary)', color: 'white', border: 'none',
                      borderRadius: '8px', padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap'
                    }}
                  >
                    <Plus size={15} /> เพิ่มลิงก์
                  </button>
                </div>

                {fileUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {fileUrls.map((url, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '85%', color: '#0284c7' }}>
                          🔗 {url}
                        </span>
                        <button type="button" onClick={() => handleRemoveFileUrl(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setActiveTab('list')} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: isSaving ? '#9ca3af' : 'linear-gradient(135deg, #059669, #0284c7)', border: 'none', color: 'white', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isSaving ? 'กำลังบันทึก...' : <><Send size={15} /> บันทึก & ส่งลูกค้าตรวจแบบ</>}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  แบบแปลนทั้งหมด ({designs.length} รายการ)
                </span>
                <button type="button" onClick={fetchDesigns} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                  <RefreshCw size={13} /> รีเฟรช
                </button>
              </div>

              {isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดแบบแปลน...</div>}

              {!isLoading && designs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)', borderRadius: '10px' }}>
                  <Palette size={36} style={{ opacity: 0.4 }} />
                  <p style={{ marginTop: '0.75rem' }}>ยังไม่มีแบบแปลน 2D/3D ที่จัดทำ</p>
                  <button type="button" onClick={() => setActiveTab('new')} style={{ marginTop: '0.5rem', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', padding: '0.45rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}>
                    + อัปโหลดแบบแปลนแรก
                  </button>
                </div>
              )}

              {!isLoading && designs.map(d => {
                const isApproved = d.status === 'Approved';
                const isRevise = d.status === 'Revise Requested';
                return (
                  <div
                    key={d.id}
                    style={{
                      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${isApproved ? '#10b981' : isRevise ? '#ef4444' : '#0284c7'}`,
                      borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>{d.title}</span>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', fontSize: '0.72rem', fontWeight: 700 }}>
                            {d.version}
                          </span>
                          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
                            {d.design_type}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                          ผู้ออกแบบ: <strong>{d.designer_name_ref || d.designer_name || '-'}</strong> · สร้างเมื่อ {new Date(d.created_at).toLocaleDateString('th-TH')}
                        </div>
                      </div>

                      <span style={{
                        padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
                        background: isApproved ? 'rgba(16, 185, 129, 0.15)' : isRevise ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isApproved ? '#059669' : isRevise ? '#dc2626' : '#d97706'
                      }}>
                        {isApproved ? '✅ ลูกค้าอนุมัติแบบแล้ว' : isRevise ? '🔄 ขอปรับปรุงแบบ' : '⏳ รอลูกค้าตรวจแบบ'}
                      </span>
                    </div>

                    {d.description && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {d.description}
                      </div>
                    )}

                    {/* Files Preview */}
                    {d.file_urls && d.file_urls.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {d.file_urls.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                              padding: '0.3rem 0.6rem', borderRadius: '6px', color: '#0284c7', fontSize: '0.75rem', textDecoration: 'none'
                            }}
                          >
                            <ExternalLink size={12} /> ดูไฟล์/รูปภาพแบบ #{idx + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {d.customer_feedback && (
                      <div style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem', borderLeft: '3px solid var(--accent-primary)' }}>
                        💬 <strong>Feedback จากลูกค้า:</strong> {d.customer_feedback}
                      </div>
                    )}

                    {/* Action buttons for Customer / PM */}
                    {!isApproved && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <input
                          type="text"
                          placeholder="พิมพ์ข้อคิดเห็นลูกค้า เช่น 'ขอเปลี่ยนสีกระเบื้องเป็นโทนเทา'..."
                          value={feedbackInput[d.id] || ''}
                          onChange={e => setFeedbackInput({ ...feedbackInput, [d.id]: e.target.value })}
                          style={{ ...inp, fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(d.id, 'Revise Requested')}
                            style={{
                              background: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                              padding: '0.4rem 0.85rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            🔄 ขอแก้ไขแบบ (Revise)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(d.id, 'Approved')}
                            style={{
                              background: '#10b981', border: 'none', color: 'white',
                              padding: '0.4rem 1.15rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.35rem', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <Check size={14} /> ✅ ลูกค้าอนุมัติแบบ (Design Approved)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignApprovalModal;
