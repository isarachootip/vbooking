import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import {
  X, DollarSign, CheckCircle2, AlertCircle, Clock, Plus,
  CreditCard, ShieldCheck, RefreshCw, FileText, ArrowRight, Check,
  Upload, Image as ImageIcon, Tag, Eye, Trash2
} from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';

interface LeadPayment {
  id: string;
  lead_id: string;
  quotation_id?: string | null;
  quotation_number?: string | null;
  quotation_total?: number | null;
  amount: number;
  payment_method: string;
  payment_type: string;
  ticket_no?: string | null;
  reference_no?: string | null;
  slip_url?: string | null;
  payment_date?: string | null;
  status: string;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

// Client-side image compressor utility
const compressImageFile = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.78): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type || 'image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    job_type?: string;
    branch?: string;
    initial_budget?: string | number;
    project_id?: string | null;
    status?: string;
  } | null;
  quotation?: {
    id: string;
    quotation_number: string;
    customer_name?: string;
    customer_phone?: string;
    lead_id?: string | null;
    lead_job_type?: string;
    grand_total: number | string;
    status: string;
    project_id?: string | null;
    lead_project_id?: string | null;
    lead_status?: string | null;
  } | null;
  currentUser: User | null;
  onSaved?: () => void;
  onConvertToProject?: (id: string) => void;
}

const PAYMENT_METHODS = [
  'โอนเข้าบัญชีธนาคาร (Bank Transfer)',
  'บัตรเครดิต (Credit Card)',
  'เช็คธนาคาร (Cheque)',
  'เงินสด (Cash)'
];

const PAYMENT_TYPES = [
  { value: 'Down Payment', label: 'เงินมัดจำงวดแรก (Down Payment)' },
  { value: 'Progress Payment', label: 'ค่างวดงานระหว่างทำ (Progress Payment)' },
  { value: 'Full Payment', label: 'ชำระเต็มจำนวน (Full Payment)' }
];

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen, onClose, lead, quotation, currentUser, onSaved, onConvertToProject
}) => {
  const [payments, setPayments] = useState<LeadPayment[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Form states
  const [quotationId, setQuotationId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [paymentType, setPaymentType] = useState('Down Payment');
  const [ticketNo, setTicketNo] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [slipMode, setSlipMode] = useState<'upload' | 'url'>('upload');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [previewZoomImage, setPreviewZoomImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const activeCustomerName = lead?.customer_name || quotation?.customer_name || 'ลูกค้าทั่วไป';
  const activePhone = lead?.customer_phone || quotation?.customer_phone || '';
  const activeJobType = lead?.job_type || quotation?.lead_job_type || '';
  const activeBranch = lead?.branch || '';
  const isAlreadyConverted = Boolean(
    lead?.project_id || 
    lead?.status === 'Converted' || 
    quotation?.project_id || 
    quotation?.status === 'Converted' || 
    quotation?.lead_project_id || 
    quotation?.lead_status === 'Converted'
  );
  const convertedProjectId = lead?.project_id || quotation?.project_id || quotation?.lead_project_id || '';

  const fetchPaymentsAndQuotes = async () => {
    if (!lead && !quotation) return;
    setIsLoading(true);
    try {
      if (lead) {
        const [pRes, qRes] = await Promise.all([
          fetch(`/api/leads/${lead.id}/payments`, { headers: { 'X-User-Id': currentUser?.id || '' } }),
          fetch(`/api/quotations?lead_id=${lead.id}`, { headers: { 'X-User-Id': currentUser?.id || '' } })
        ]);

        if (pRes.ok) setPayments(await pRes.json());
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuotations(qData || []);
          if (qData.length > 0) {
            setQuotationId(qData[0].id);
            const qTotal = parseFloat(qData[0].grand_total || '0');
            if (qTotal > 0) {
              setAmount(String(Math.round(qTotal * 0.3)));
            }
          }
        }
      } else if (quotation) {
        if (quotation.lead_id) {
          const [pRes, qRes] = await Promise.all([
            fetch(`/api/leads/${quotation.lead_id}/payments`, { headers: { 'X-User-Id': currentUser?.id || '' } }),
            fetch(`/api/quotations?lead_id=${quotation.lead_id}`, { headers: { 'X-User-Id': currentUser?.id || '' } })
          ]);
          if (pRes.ok) setPayments(await pRes.json());
          if (qRes.ok) {
            const qData = await qRes.json();
            setQuotations(qData || []);
          }
        } else {
          const pRes = await fetch(`/api/quotations/${quotation.id}/payments`, { headers: { 'X-User-Id': currentUser?.id || '' } });
          if (pRes.ok) setPayments(await pRes.json());
          setQuotations([quotation]);
        }
        setQuotationId(quotation.id);
        const qTotal = parseFloat(String(quotation.grand_total || '0'));
        if (qTotal > 0) {
          setAmount(String(Math.round(qTotal * 0.3)));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && (lead || quotation)) {
      fetchPaymentsAndQuotes();
      setPaymentMethod(PAYMENT_METHODS[0]);
      setPaymentType('Down Payment');
      setTicketNo('');
      setSlipUrl('');
      setSlipMode('upload');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setActiveTab('form');
    }
  }, [isOpen, lead?.id, quotation?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, HEIC) เท่านั้น', 'error');
      return;
    }

    try {
      showToast('กำลังประมวลผลรูปภาพ...', 'success');
      const compressedBase64 = await compressImageFile(file);
      setSlipUrl(compressedBase64);
      showToast('แนบรูปสลิปสำเร็จ!', 'success');
    } catch (err) {
      console.error('Error compressing slip:', err);
      showToast('ไม่สามารถโหลดรูปภาพได้', 'error');
    }
  };

  const totalPaid = payments.reduce((acc, p) => acc + parseFloat(String(p.amount || 0)), 0);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead && !quotation) return;
    setIsSaving(true);
    try {
      const url = lead?.id 
        ? `/api/leads/${lead.id}/payments` 
        : quotation?.lead_id 
          ? `/api/leads/${quotation.lead_id}/payments`
          : `/api/quotations/${quotation?.id}/payments`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          quotation_id: quotationId || quotation?.id || null,
          amount: parseFloat(amount || '0'),
          payment_method: paymentMethod,
          payment_type: paymentType,
          ticket_no: ticketNo.trim() || null,
          reference_no: ticketNo.trim() || null,
          slip_url: slipUrl || null,
          payment_date: paymentDate,
          status: 'Verified & Received',
          verified_by: currentUser?.name || 'Admin',
          notes: notes || null,
          created_by: currentUser?.name || 'System'
        })
      });

      if (res.ok) {
        showToast('✅ บันทึกการรับชำระเงินมัดจำเรียบร้อยแล้ว!', 'success');
        await fetchPaymentsAndQuotes();
        setActiveTab('history');
        onSaved?.();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.details || err.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || (!lead && !quotation)) return null;

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

      {/* Modal Zoom Preview */}
      {previewZoomImage && (
        <div
          onClick={() => setPreviewZoomImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.88)', zIndex: 3000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '1.5rem', cursor: 'zoom-out'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewZoomImage}
              alt="Slip Zoom"
              style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            />
            <button
              onClick={() => setPreviewZoomImage(null)}
              style={{
                position: 'absolute', top: '-12px', right: '-12px',
                background: '#ef4444', border: 'none', color: 'white',
                borderRadius: '50%', width: '32px', height: '32px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--bg-primary)', borderRadius: '16px',
        border: '1px solid var(--border-color)', width: '720px', maxWidth: '96vw',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', margin: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>
                บันทึกการรับชำระเงินมัดจำ & แปลงเป็นโครงการ (Down Payment Entry)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                {activeCustomerName} {activePhone ? `(${activePhone})` : ''} · {activeJobType || 'Renovation'} {activeBranch ? '· ' + activeBranch : ''}
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
            onClick={() => setActiveTab('form')}
            style={{
              flex: 1, padding: '0.75rem 1rem', border: 'none',
              background: activeTab === 'form' ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === 'form' ? '#10b981' : 'var(--text-secondary)',
              fontWeight: activeTab === 'form' ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer',
              borderBottom: activeTab === 'form' ? '2px solid #10b981' : '2px solid transparent'
            }}
          >
            + บันทึกรับชำระเงินมัดจำ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1, padding: '0.75rem 1rem', border: 'none',
              background: activeTab === 'history' ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === 'history' ? '#10b981' : 'var(--text-secondary)',
              fontWeight: activeTab === 'history' ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer',
              borderBottom: activeTab === 'history' ? '2px solid #10b981' : '2px solid transparent'
            }}
          >
            ประวัติการรับชำระ ({payments.length}) · ยอดรวม ฿{totalPaid.toLocaleString()}
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '74vh' }}>
          {activeTab === 'form' && (
            <form onSubmit={handleSubmitPayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Linked Quotation info */}
              {quotations.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <label style={lbl}>เลือกใบเสนอราคาที่อ้างอิง</label>
                  <select value={quotationId} onChange={e => setQuotationId(e.target.value)} style={inp}>
                    {quotations.map(q => (
                      <option key={q.id} value={q.id}>
                        {q.quotation_number} — ยอดรวม ฿{Number(q.grand_total).toLocaleString()} ({new Date(q.issue_date).toLocaleDateString('th-TH')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ประเภทการชำระ *</label>
                  <select value={paymentType} onChange={e => setPaymentType(e.target.value)} style={inp}>
                    {PAYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>ยอดเงินที่ได้รับชำระจริง (บาท) *</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      min={1}
                      style={{ ...inp, paddingLeft: '1.75rem', fontWeight: 700, color: '#10b981' }}
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ช่องทางการชำระ *</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={inp}>
                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>วันที่ได้รับเงินจริง * (DD/MM/YYYY)</label>
                  <CustomDateInput value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={inp} required />
                </div>
              </div>

              {/* Key Ticket / Reference No. */}
              <div>
                <label style={lbl}>
                  <Tag size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle', color: '#10b981' }} />
                  เลขที่ตั๋ว / เลขที่ใบเสร็จ / เลขที่อ้างอิงธุรกรรม (Key Ticket / Reference No.)
                </label>
                <input
                  type="text"
                  value={ticketNo}
                  onChange={e => setTicketNo(e.target.value)}
                  placeholder="เช่น TICKET-2026-0801, REC-9821, หรือ Transaction Ref ID"
                  style={{ ...inp, fontFamily: 'monospace', fontWeight: 600 }}
                />
              </div>

              {/* Slip Upload & Attachment */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.9rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ ...lbl, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ImageIcon size={14} style={{ color: '#10b981' }} />
                    แนบรูปภาพสลิปโอนเงิน / ใบเสร็จรับเงิน (Add Slip)
                  </label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setSlipMode('upload')}
                      style={{
                        fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: 'none',
                        background: slipMode === 'upload' ? '#10b981' : 'transparent',
                        color: slipMode === 'upload' ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 600
                      }}
                    >
                      📁 อัปโหลดไฟล์ / ถ่ายรูป
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlipMode('url')}
                      style={{
                        fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: '4px', border: 'none',
                        background: slipMode === 'url' ? '#10b981' : 'transparent',
                        color: slipMode === 'url' ? 'white' : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 600
                      }}
                    >
                      🔗 ลิงก์ URL
                    </button>
                  </div>
                </div>

                {slipMode === 'upload' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                    
                    {!slipUrl ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                          border: '2px dashed var(--border-color)',
                          borderRadius: '8px',
                          padding: '1.25rem',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: 'var(--bg-tertiary)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Upload size={28} style={{ color: '#10b981', margin: '0 auto 0.4rem', display: 'block' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          คลิกเพื่อเลือกรูปสลิป หรือ ถ่ายรูปจากมือถือ
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                          รองรับ JPG, PNG, HEIC (ระบบจะบีบอัดขนาดให้อัตโนมัติ)
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <img
                          src={slipUrl}
                          alt="Slip Preview"
                          onClick={() => setPreviewZoomImage(slipUrl)}
                          style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> แนบรูปสลิปแล้ว
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            คลิกที่รูปเพื่อดูภาพขนาดใหญ่
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={() => setPreviewZoomImage(slipUrl)}
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <Eye size={13} /> ดู
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSlipUrl('');
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            <Trash2 size={13} /> ลบ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={slipUrl}
                      onChange={e => setSlipUrl(e.target.value)}
                      placeholder="https://... หรือแนบลิงก์รูปสลิปจาก Cloud Storage"
                      style={inp}
                    />
                    {slipUrl && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <img
                          src={slipUrl}
                          alt="Slip URL Preview"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                          onClick={() => setPreviewZoomImage(slipUrl)}
                          style={{ maxHeight: '100px', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label style={lbl}>หมายเหตุการชำระเงินเพิ่มเติม</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="เช่น มัดจำ 30% งวดแรก ธนาคารกสิกรไทย สาขา..."
                  rows={2}
                  style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: isSaving ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
                  {isSaving ? 'กำลังบันทึก...' : <><Check size={15} /> บันทึกการรับชำระเงินมัดจำ</>}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Convert Banner if payment received */}
              {isAlreadyConverted ? (
                <div style={{
                  background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '10px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem'
                }}>
                  <ShieldCheck size={22} color="#7c3aed" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#7c3aed', fontSize: '0.9rem' }}>
                      🔒 ลูกค้า / Lead รายนี้ได้เปิดโครงการติดตั้งเรียบร้อยแล้ว
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      รหัสโครงการ: <strong>{convertedProjectId || 'เปิดโครงการแล้ว'}</strong> · มียอดชำระสะสม: ฿{totalPaid.toLocaleString()} (ไม่อนุญาตให้แปลงโครงการซ้ำ)
                    </div>
                  </div>
                </div>
              ) : totalPaid > 0 ? (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981',
                  borderRadius: '10px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <ShieldCheck size={16} /> ยืนยันเงินมัดจำแล้ว พร้อมเปิดโครงการติดตั้ง!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      ยอดชำระสะสม: <strong>฿{totalPaid.toLocaleString()}</strong> (ผ่านเงื่อนไข Financial Gatekeeper)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      const targetId = lead?.id || quotation?.id || '';
                      if (targetId) onConvertToProject?.(targetId);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: 'none', color: 'white', padding: '0.55rem 1.25rem', borderRadius: '8px',
                      fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    🚀 แปลงเป็นโครงการติดตั้ง (Convert to Project)
                  </button>
                </div>
              ) : null}

              {isLoading && <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดรายการชำระ...</div>}

              {!isLoading && payments.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)', borderRadius: '10px' }}>
                  <DollarSign size={36} style={{ opacity: 0.4 }} />
                  <p style={{ marginTop: '0.75rem' }}>ยังไม่มีรายการรับชำระเงินมัดจำ</p>
                  <button type="button" onClick={() => setActiveTab('form')} style={{ marginTop: '0.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '0.45rem 1.25rem', fontWeight: 600, cursor: 'pointer' }}>
                    + บันทึกมัดจำงวดแรก
                  </button>
                </div>
              )}

              {!isLoading && payments.map(p => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderLeft: '4px solid #10b981', borderRadius: '10px', padding: '1rem',
                    display: 'flex', flexDirection: 'column', gap: '0.6rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#10b981' }}>
                        + ฿{Number(p.amount).toLocaleString()} บาท
                      </span>
                      {(p.ticket_no || p.reference_no) && (
                        <span style={{ padding: '0.15rem 0.5rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>
                          🏷️ {p.ticket_no || p.reference_no}
                        </span>
                      )}
                    </div>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                      {p.payment_type}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div><b style={{ color: 'var(--text-tertiary)' }}>ช่องทาง:</b> {p.payment_method}</div>
                    <div><b style={{ color: 'var(--text-tertiary)' }}>วันที่ชำระ:</b> {p.payment_date ? formatToDDMMYYYY(p.payment_date) : '-'}</div>
                    {p.quotation_number && <div><b style={{ color: 'var(--text-tertiary)' }}>ใบเสนอราคา:</b> {p.quotation_number}</div>}
                    {p.verified_by && <div><b style={{ color: 'var(--text-tertiary)' }}>ผู้ตรวจสอบ:</b> {p.verified_by}</div>}
                  </div>

                  {p.slip_url && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <img
                        src={p.slip_url}
                        alt="Slip Thumbnail"
                        onClick={() => setPreviewZoomImage(p.slip_url || null)}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>หลักฐานการชำระเงิน (Slip)</div>
                        <button
                          type="button"
                          onClick={() => setPreviewZoomImage(p.slip_url || null)}
                          style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '0.75rem', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          คลิกเพื่อดูรูปสลิปขนาดเต็ม
                        </button>
                      </div>
                    </div>
                  )}

                  {p.notes && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                      💬 {p.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
