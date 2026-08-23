import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import {
  X, DollarSign, CheckCircle2, AlertCircle, Clock, Plus,
  CreditCard, ShieldCheck, RefreshCw, FileText, ArrowRight, Check
} from 'lucide-react';

interface LeadPayment {
  id: string;
  lead_id: string;
  quotation_id?: string | null;
  quotation_number?: string | null;
  quotation_total?: number | null;
  amount: number;
  payment_method: string;
  payment_type: string;
  slip_url?: string | null;
  payment_date?: string | null;
  status: string;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    job_type?: string;
    branch?: string;
    initial_budget?: string | number;
  } | null;
  currentUser: User | null;
  onSaved?: () => void;
  onConvertToProject?: (leadId: string) => void;
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
  isOpen, onClose, lead, currentUser, onSaved, onConvertToProject
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
  const [slipUrl, setSlipUrl] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchPaymentsAndQuotes = async () => {
    if (!lead) return;
    setIsLoading(true);
    try {
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
          // Suggest 30% or 50% down payment
          const qTotal = parseFloat(qData[0].grand_total || '0');
          if (qTotal > 0) {
            setAmount(String(Math.round(qTotal * 0.3)));
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead) {
      fetchPaymentsAndQuotes();
      setPaymentMethod(PAYMENT_METHODS[0]);
      setPaymentType('Down Payment');
      setSlipUrl('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setActiveTab('form');
    }
  }, [isOpen, lead?.id]);

  const totalPaid = payments.reduce((acc, p) => acc + parseFloat(String(p.amount || 0)), 0);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          quotation_id: quotationId || null,
          amount: parseFloat(amount || '0'),
          payment_method: paymentMethod,
          payment_type: paymentType,
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
        showToast(err.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
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
        border: '1px solid var(--border-color)', width: '700px', maxWidth: '96vw',
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
            onClick={() => setActiveTab('form')}
            style={{
              flex: 1, padding: '0.75rem 1rem', border: 'none',
              background: activeTab === 'form' ? 'var(--bg-primary)' : 'transparent',
              color: activeTab === 'form' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'form' ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer',
              borderBottom: activeTab === 'form' ? '2px solid var(--accent-primary)' : '2px solid transparent'
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
              color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'history' ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer',
              borderBottom: activeTab === 'history' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            ประวัติการรับชำระ ({payments.length}) · ยอดรวม ฿{totalPaid.toLocaleString()}
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '72vh' }}>
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
                  <label style={lbl}>วันที่ได้รับเงินจริง *</label>
                  <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={inp} required />
                </div>
              </div>

              <div>
                <label style={lbl}>ลิงก์รูปภาพสลิปโอนเงิน / ใบเสร็จรับเงิน</label>
                <input
                  type="url"
                  value={slipUrl}
                  onChange={e => setSlipUrl(e.target.value)}
                  placeholder="https://... หรือแนบลิงก์รูปสลิป"
                  style={inp}
                />
              </div>

              <div>
                <label style={lbl}>หมายเหตุการชำระเงิน / เลขที่อ้างอิง</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="เช่น มัดจำ 30% งวดแรก, ธนาคารกสิกรไทย..."
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
              {totalPaid > 0 && (
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
                      onConvertToProject?.(lead.id);
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
              )}

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
                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#10b981' }}>
                      + ฿{Number(p.amount).toLocaleString()} บาท
                    </span>
                    <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
                      {p.payment_type}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div><b style={{ color: 'var(--text-tertiary)' }}>ช่องทาง:</b> {p.payment_method}</div>
                    <div><b style={{ color: 'var(--text-tertiary)' }}>วันที่ชำระ:</b> {p.payment_date ? new Date(p.payment_date).toLocaleDateString('th-TH') : '-'}</div>
                    {p.quotation_number && <div><b style={{ color: 'var(--text-tertiary)' }}>ใบเสนอราคา:</b> {p.quotation_number}</div>}
                    {p.verified_by && <div><b style={{ color: 'var(--text-tertiary)' }}>ผู้ตรวจสอบ:</b> {p.verified_by}</div>}
                  </div>

                  {p.slip_url && (
                    <div>
                      <a href={p.slip_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#0284c7', textDecoration: 'underline' }}>
                        🔗 ดูสลิปหลักฐานการโอน
                      </a>
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
