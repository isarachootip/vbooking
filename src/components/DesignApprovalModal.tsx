import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { isQcUser } from '../utils';
import {
  X, Palette, CheckCircle2, AlertCircle, Clock, Plus,
  FileImage, ExternalLink, RefreshCw, Send, Check, MessageSquare,
  Layers, Upload, FileText, Trash2, Eye, ZoomIn, ZoomOut, RotateCw, Download, Maximize2
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
  const isQc = isQcUser(currentUser);
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
  const [fileNames, setFileNames] = useState<{ [url: string]: string }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Lightbox / Image Viewer state
  const [lightboxData, setLightboxData] = useState<{ url: string; title: string; version?: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Helper: Convert Base64 data URL to Blob for safe browser viewing / download
  const dataUrlToBlob = (dataUrl: string): Blob => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleOpenFileSafe = (url: string, title?: string, version?: string) => {
    const isImg = url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
    if (isImg) {
      setZoomLevel(1);
      setRotation(0);
      setLightboxData({ url, title: title || 'แบบแปลน 2D/3D', version });
      return;
    }

    if (url.startsWith('data:application/pdf') || url.startsWith('data:')) {
      try {
        const blob = dataUrlToBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      } catch (e) {
        console.error('Error opening blob url:', e);
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDownloadFile = (url: string, filename: string) => {
    try {
      if (url.startsWith('data:')) {
        const blob = dataUrlToBlob(url);
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || 'design_plan.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || 'design_plan';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
      window.open(url, '_blank');
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
      setFileNames({});
      setFileUrlInput('');
      setLightboxData(null);
    }
  }, [isOpen, lead?.id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setFileUrls(prev => [...prev, result]);
          setFileNames(prev => ({ ...prev, [result]: file.name }));
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddFileUrl = () => {
    if (!fileUrlInput.trim()) return;
    const url = fileUrlInput.trim();
    setFileUrls([...fileUrls, url]);
    setFileNames({ ...fileNames, [url]: url });
    setFileUrlInput('');
  };

  const handleRemoveFileUrl = (index: number) => {
    const targetUrl = fileUrls[index];
    setFileUrls(fileUrls.filter((_, i) => i !== index));
    const nextNames = { ...fileNames };
    delete nextNames[targetUrl];
    setFileNames(nextNames);
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
    if (newStatus === 'Approved' && isQc) {
      showToast('⚠️ บัญชี QC ไม่มีสิทธิ์กดปุ่มอนุมัติแบบ (สิทธิ์อนุมัติเฉพาะ Admin หรือ PM/Designer)', 'error');
      return;
    }
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
        border: '1px solid var(--border-color)', width: '780px', maxWidth: '96vw',
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
                  placeholder="เช่น สรุปการปรับผังทิศทางแสง, ปลั๊กไฟ, สีตู้ Built-in, รายการวัสดุผิวสัมผัส..."
                  rows={3}
                  style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
                />
              </div>

              {/* TWO WAYS TO ATTACH FILES: 1) Browse from Computer, 2) Paste Cloud URL */}
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label style={{ ...lbl, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                  📎 การแนบไฟล์แบบแปลน (เลือกไฟล์จากคอม หรือ แนบลิงก์)
                </label>

                {/* Option 1: File Browser */}
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      background: 'linear-gradient(135deg, #059669, #0284c7)', color: 'white', border: 'none',
                      padding: '0.55rem 1.15rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                    }}
                  >
                    <Upload size={15} /> 📂 เลือกไฟล์จากเครื่อง (รูปภาพ / PDF)
                  </button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>รองรับ JPG, PNG, WEBP, PDF</span>
                </div>

                {/* Option 2: Cloud / Drive URL */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="url"
                    value={fileUrlInput}
                    onChange={e => setFileUrlInput(e.target.value)}
                    placeholder="หรือวางลิงก์ Google Drive / Cloud URL (https://...)"
                    style={inp}
                  />
                  <button
                    type="button"
                    onClick={handleAddFileUrl}
                    style={{
                      background: 'var(--accent-primary)', color: 'white', border: 'none',
                      borderRadius: '8px', padding: '0.55rem 1rem', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', fontSize: '0.82rem'
                    }}
                  >
                    <Plus size={15} /> เพิ่มลิงก์
                  </button>
                </div>

                {/* Preview attached files */}
                {fileUrls.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      ไฟล์ที่แนบแล้ว ({fileUrls.length} รายการ):
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      {fileUrls.map((url, idx) => {
                        const isBase64Image = url.startsWith('data:image');
                        const displayName = fileNames[url] || `ไฟล์แบบ #${idx + 1}`;
                        return (
                          <div key={idx} style={{
                            background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                            borderRadius: '8px', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
                            position: 'relative'
                          }}>
                            {isBase64Image ? (
                              <img src={url} alt={displayName} style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : (
                              <div style={{ height: '90px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: '4px' }}>
                                <FileText size={28} style={{ color: '#0284c7', opacity: 0.8 }} />
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>เอกสาร/ลิงก์</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 600 }}>
                                {displayName}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFileUrl(idx)}
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', borderRadius: '4px', padding: '0.2rem', cursor: 'pointer' }}
                                title="ลบไฟล์"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

                    {/* Files Preview with visual thumbnail gallery */}
                    {d.file_urls && d.file_urls.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.35rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          🖼️ ไฟล์แบบแปลนและเอกสารแนบ ({d.file_urls.length} รายการ):
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.65rem' }}>
                          {d.file_urls.map((url, idx) => {
                            const isImage = url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i);
                            const fileName = `แบบแปลน_${d.version}_#${idx + 1}`;
                            return (
                              <div
                                key={idx}
                                style={{
                                  background: 'var(--bg-tertiary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  transition: 'all 0.2s ease',
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                }}
                              >
                                {isImage ? (
                                  <div
                                    onClick={() => handleOpenFileSafe(url, d.title, d.version)}
                                    style={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '110px',
                                      cursor: 'pointer',
                                      background: '#18181b',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      overflow: 'hidden'
                                    }}
                                    title="คลิกเพื่อดูรูปภาพแบบแปลนขนาดเต็ม"
                                  >
                                    <img
                                      src={url}
                                      alt={fileName}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transition: 'transform 0.25s ease'
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06)')}
                                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    />
                                    <div
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem',
                                        color: 'white',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        opacity: 0,
                                        transition: 'opacity 0.2s ease'
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                      onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                                    >
                                      <Eye size={15} /> ดูรูปขนาดเต็ม
                                    </div>
                                    <span
                                      style={{
                                        position: 'absolute',
                                        top: '6px',
                                        left: '6px',
                                        background: 'rgba(0,0,0,0.65)',
                                        color: '#38bdf8',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '4px',
                                        fontSize: '0.68rem',
                                        fontWeight: 700
                                      }}
                                    >
                                      #{idx + 1}
                                    </span>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => handleOpenFileSafe(url, d.title, d.version)}
                                    style={{
                                      height: '110px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: 'var(--bg-primary)',
                                      cursor: 'pointer'
                                    }}
                                    title="คลิกเพื่อเปิดเอกสาร"
                                  >
                                    <FileText size={32} color="#0284c7" />
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                                      เอกสาร PDF/แบบ
                                    </span>
                                  </div>
                                )}

                                <div style={{ padding: '0.4rem 0.55rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
                                  <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100px' }}>
                                    {fileName}
                                  </span>
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFileSafe(url, d.title, d.version)}
                                      style={{
                                        background: 'rgba(2, 132, 199, 0.12)',
                                        border: 'none',
                                        color: '#0284c7',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.45rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem'
                                      }}
                                      title="ขยายดูภาพเต็ม"
                                    >
                                      <Eye size={12} /> ดูแบบ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadFile(url, `${fileName}.jpg`)}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.12)',
                                        border: 'none',
                                        color: '#10b981',
                                        borderRadius: '4px',
                                        padding: '0.25rem 0.4rem',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                      }}
                                      title="ดาวน์โหลดไฟล์แบบ"
                                    >
                                      <Download size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                          {!isQc && (
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
                          )}
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

      {/* ========================================================================= */}
      {/* LIGHTBOX / FULL-SCREEN IMAGE & DESIGN VIEWER MODAL                        */}
      {/* ========================================================================= */}
      {lightboxData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setLightboxData(null)}
        >
          {/* Lightbox Header Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(24, 24, 27, 0.85)',
              padding: '0.75rem 1.25rem',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
              gap: '1rem',
              zIndex: 10000
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Palette size={18} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{lightboxData.title}</div>
                {lightboxData.version && (
                  <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>
                    เวอร์ชัน: {lightboxData.version}
                  </span>
                )}
              </div>
            </div>

            {/* Lightbox Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.78rem'
                }}
                title="ซูมออก (-)"
              >
                <ZoomOut size={15} />
              </button>

              <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '45px', textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.78rem'
                }}
                title="ซูมเข้า (+)"
              >
                <ZoomIn size={15} />
              </button>

              <button
                type="button"
                onClick={() => setRotation(prev => (prev + 90) % 360)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.78rem'
                }}
                title="หมุนรูป 90°"
              >
                <RotateCw size={15} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setZoomLevel(1);
                  setRotation(0);
                }}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.78rem'
                }}
                title="รีเซ็ตขนาด"
              >
                100%
              </button>

              <button
                type="button"
                onClick={() => handleDownloadFile(lightboxData.url, `${lightboxData.title || 'แบบแปลน'}.jpg`)}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  border: 'none',
                  color: 'white',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.78rem'
                }}
                title="ดาวน์โหลดไฟล์รูปภาพ"
              >
                <Download size={15} /> ดาวน์โหลด
              </button>

              <button
                type="button"
                onClick={() => setLightboxData(null)}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: 'white',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="ปิดหน้าต่าง (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Centered Image Stage */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              padding: '1rem',
              position: 'relative'
            }}
          >
            <img
              src={lightboxData.url}
              alt={lightboxData.title}
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '92vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease',
                borderRadius: '8px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
                cursor: zoomLevel > 1 ? 'grab' : 'default'
              }}
            />
          </div>

          {/* Lightbox Footer Note */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', paddingBottom: '0.5rem' }}>
            💡 คลิกบริเวณภายนอกรูปภาพ หรือกดปุ่ม <strong>[X]</strong> เพื่อปิดหน้าต่าง
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignApprovalModal;
