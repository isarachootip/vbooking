import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import {
  X, ClipboardCheck, Calendar, User as UserIcon,
  CheckCircle2, AlertCircle, Clock, ChevronRight, Building,
  RefreshCw, DollarSign, MessageSquare
} from 'lucide-react';

interface SiteVisitResult {
  id: string;
  lead_id: string;
  visited_by_id?: string | null;
  visited_by_name?: string | null;
  visited_by_name_ref?: string | null;
  visit_date?: string | null;
  visit_result: string;
  site_condition?: string | null;
  work_scope_summary?: string | null;
  estimated_budget?: number | null;
  customer_interest?: string | null;
  customer_decision?: string | null;
  next_action?: string | null;
  next_action_date?: string | null;
  internal_notes?: string | null;
  photos?: string[];
  created_at: string;
  created_by?: string | null;
}

interface SiteVisitResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    customer_address?: string;
    job_type?: string;
    branch?: string;
  } | null;
  currentUser: User | null;
  users?: User[];
  onSaved?: () => void;
}

const VISIT_RESULT_OPTIONS = [
  { value: 'Visited', label: 'เข้า Visit สำเร็จ', color: '#10b981' },
  { value: 'Customer Absent', label: 'ลูกค้าไม่อยู่', color: '#f59e0b' },
  { value: 'Cancelled', label: 'ยกเลิกนัด', color: '#ef4444' },
  { value: 'Rescheduled', label: 'เลื่อนนัดใหม่', color: '#6366f1' },
];

const CUSTOMER_DECISION_OPTIONS = [
  { value: 'Interested', label: 'สนใจดำเนินการ' },
  { value: 'Need More Info', label: 'ต้องการข้อมูลเพิ่ม' },
  { value: 'Pending Quote', label: 'รอใบเสนอราคา' },
  { value: 'Not Interested', label: 'ไม่สนใจ' },
];

const NEXT_ACTION_OPTIONS = [
  { value: 'send_quotation', label: 'ส่งใบเสนอราคา' },
  { value: 'follow_up_call', label: 'โทรติดตาม' },
  { value: 'reschedule_visit', label: 'นัด Visit ใหม่' },
  { value: 'close_lost', label: 'ปิด (ไม่สนใจ)' },
  { value: 'none', label: 'ยังไม่กำหนด' },
];

const fmtDate = (s?: string | null) => {
  if (!s) return '-';
  try {
    return new Date(s).toLocaleString('th-TH', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return s; }
};

export const SiteVisitResultModal: React.FC<SiteVisitResultModalProps> = ({
  isOpen, onClose, lead, currentUser, users = [], onSaved,
}) => {
  const [results, setResults] = useState<SiteVisitResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [uid, setUid] = useState(currentUser?.id || '');
  const [uname, setUname] = useState(currentUser?.name || '');
  const [vdate, setVdate] = useState('');
  const [vres, setVres] = useState('Visited');
  const [scond, setScond] = useState('');
  const [wscope, setWscope] = useState('');
  const [budget, setBudget] = useState('');
  const [cint, setCint] = useState('');
  const [cdec, setCdec] = useState('Interested');
  const [nact, setNact] = useState('send_quotation');
  const [nadate, setNadate] = useState('');
  const [inotes, setInotes] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchR = async () => {
    if (!lead) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/leads/${lead.id}/visit-results`, {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (r.ok) setResults(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isOpen && lead) {
      fetchR();
      setUid(currentUser?.id || '');
      setUname(currentUser?.name || '');
      const now = new Date();
      setVdate(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      setVres('Visited'); setScond(''); setWscope(''); setBudget('');
      setCint(''); setCdec('Interested'); setNact('send_quotation'); setNadate(''); setInotes('');
      setTab('new');
    }
  }, [isOpen, lead?.id]);

  const chgUser = (id: string) => {
    setUid(id);
    const u = users.find(x => x.id === id);
    setUname(u?.name || id);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/leads/${lead.id}/visit-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({
          visited_by_id: uid || null, visited_by_name: uname,
          visit_date: vdate ? new Date(vdate).toISOString() : new Date().toISOString(),
          visit_result: vres, site_condition: scond || null, work_scope_summary: wscope || null,
          estimated_budget: budget ? parseFloat(budget) : null,
          customer_interest: cint || null, customer_decision: cdec,
          next_action: nact, next_action_date: nadate || null,
          internal_notes: inotes || null, photos: [],
          created_by: currentUser?.name || 'System'
        })
      });
      if (r.ok) {
        showToast('บันทึกสำเร็จ!', 'success');
        await fetchR(); setTab('history'); onSaved?.();
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(err.error || 'เกิดข้อผิดพลาด', 'error');
      }
    } catch { showToast('ไม่สามารถเชื่อมต่อ', 'error'); }
    finally { setSaving(false); }
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
  const sec: React.CSSProperties = {
    background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
    borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
  };
  const sh: React.CSSProperties = {
    fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem'
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1500, padding: '1rem', overflowY: 'auto' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 2000, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}
      <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', width: '700px', maxWidth: '96vw', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', margin: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', background: 'linear-gradient(135deg,#1e40af,#7c3aed)', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}><ClipboardCheck size={20} /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'white' }}>บันทึกผลการ Visit Site</h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>{lead.customer_name} · {lead.job_type || ''}{lead.branch ? ' · ' + lead.branch : ''}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex' }}><X size={20} /></button>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          {([{ k: 'new' as const, l: '+ บันทึกผลใหม่' }, { k: 'history' as const, l: `ประวัติ (${results.length})` }]).map(t => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)} style={{ flex: 1, padding: '0.75rem 1rem', border: 'none', background: tab === t.k ? 'var(--bg-primary)' : 'transparent', color: tab === t.k ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: tab === t.k ? 700 : 500, fontSize: '0.83rem', cursor: 'pointer', borderBottom: tab === t.k ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>{t.l}</button>
          ))}
        </div>
        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '72vh' }}>
          {tab === 'new' && (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* S1 */}
              <div style={sec}>
                <div style={sh}><Calendar size={15} style={{ color: '#6366f1' }} /> ส่วนที่ 1 — ข้อมูลการ Visit</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={lbl}>วัน/เวลาที่ไป Visit จริง *</label>
                    <input type="datetime-local" value={vdate} onChange={e => setVdate(e.target.value)} style={inp} required />
                  </div>
                  <div>
                    <label style={lbl}>ผู้ที่ไป Visit *</label>
                    {users.length > 0
                      ? <select value={uid} onChange={e => chgUser(e.target.value)} style={inp}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}<option value="">— ระบุชื่อ —</option></select>
                      : <input type="text" value={uname} onChange={e => setUname(e.target.value)} placeholder="ชื่อผู้ไป Visit" style={inp} />}
                  </div>
                </div>
                <div>
                  <label style={lbl}>ผลการ Visit *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
                    {VISIT_RESULT_OPTIONS.map(o => (
                      <button key={o.value} type="button" onClick={() => setVres(o.value)} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: vres === o.value ? `2px solid ${o.color}` : '2px solid var(--border-color)', background: vres === o.value ? `${o.color}18` : 'var(--bg-tertiary)', color: vres === o.value ? o.color : 'var(--text-secondary)', fontWeight: vres === o.value ? 700 : 500, fontSize: '0.82rem', textAlign: 'left' }}>{o.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              {/* S2 */}
              {vres === 'Visited' && (
                <div style={sec}>
                  <div style={sh}><Building size={15} style={{ color: '#f59e0b' }} /> ส่วนที่ 2 — สภาพหน้างาน</div>
                  <div>
                    <label style={lbl}>สภาพบ้าน/พื้นที่</label>
                    <textarea value={scond} onChange={e => setScond(e.target.value)} placeholder="เช่น บ้านเดี่ยว 2 ชั้น 200 ตร.ม." rows={3} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                  </div>
                  <div>
                    <label style={lbl}>สรุปขอบเขตงาน</label>
                    <textarea value={wscope} onChange={e => setWscope(e.target.value)} placeholder="เช่น เปลี่ยนท่อน้ำ + ยาแนว" rows={3} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                  </div>
                  <div style={{ maxWidth: '260px' }}>
                    <label style={lbl}>งบประมาณ (บาท)</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" min={0} style={{ ...inp, paddingLeft: '1.75rem' }} />
                    </div>
                  </div>
                </div>
              )}
              {/* S3 */}
              {vres === 'Visited' && (
                <div style={sec}>
                  <div style={sh}><MessageSquare size={15} style={{ color: '#10b981' }} /> ส่วนที่ 3 — ความต้องการลูกค้า</div>
                  <div>
                    <label style={lbl}>สิ่งที่ลูกค้าพูด / ความต้องการ</label>
                    <textarea value={cint} onChange={e => setCint(e.target.value)} placeholder="เช่น ต้องการซ่อมก่อน 10 ต.ค." rows={3} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                  </div>
                  <div>
                    <label style={lbl}>การตัดสินใจลูกค้า *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
                      {CUSTOMER_DECISION_OPTIONS.map(o => (
                        <button key={o.value} type="button" onClick={() => setCdec(o.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: cdec === o.value ? '2px solid var(--accent-primary)' : '2px solid var(--border-color)', background: cdec === o.value ? 'var(--accent-bg)' : 'var(--bg-tertiary)', color: cdec === o.value ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: cdec === o.value ? 700 : 500, fontSize: '0.82rem', textAlign: 'left' }}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {/* S4 */}
              <div style={sec}>
                <div style={sh}><ChevronRight size={15} style={{ color: '#ec4899' }} /> ส่วนที่ 4 — การดำเนินการต่อ</div>
                <div>
                  <label style={lbl}>การดำเนินการครั้งถัดไป *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {NEXT_ACTION_OPTIONS.map(o => (
                      <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: nact === o.value ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: nact === o.value ? 600 : 400, padding: '0.45rem 0.6rem', borderRadius: '6px', background: nact === o.value ? 'var(--bg-tertiary)' : 'transparent', border: nact === o.value ? '1px solid var(--border-color)' : '1px solid transparent' }}>
                        <input type="radio" name="nact" value={o.value} checked={nact === o.value} onChange={() => setNact(o.value)} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>
                {(nact === 'follow_up_call' || nact === 'reschedule_visit') && (
                  <div>
                    <label style={lbl}>วันนัดหมายครั้งถัดไป</label>
                    <input type="date" value={nadate} onChange={e => setNadate(e.target.value)} style={inp} />
                  </div>
                )}
                <div>
                  <label style={lbl}>หมายเหตุภายใน (PM/SA/Admin)</label>
                  <textarea value={inotes} onChange={e => setInotes(e.target.value)} placeholder="บันทึกข้อสังเกต" rows={2} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>ยกเลิก</button>
                <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: saving ? '#9ca3af' : 'linear-gradient(135deg,#1e40af,#7c3aed)', border: 'none', color: 'white', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.4)' }}>
                  {saving ? 'กำลังบันทึก...' : <><ClipboardCheck size={15} /> บันทึกผลการ Visit</>}
                </button>
              </div>
            </form>
          )}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ประวัติ {results.length} รายการ</span>
                <button type="button" onClick={fetchR} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}><RefreshCw size={13} /> รีเฟรช</button>
              </div>
              {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลด...</div>}
              {!loading && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)', borderRadius: '10px' }}>
                  <ClipboardCheck size={36} style={{ opacity: 0.4 }} />
                  <p>ยังไม่มีผลการ Visit</p>
                  <button type="button" onClick={() => setTab('new')} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer' }}>+ บันทึกผลครั้งแรก</button>
                </div>
              )}
              {!loading && results.map(r => {
                const ro = VISIT_RESULT_OPTIONS.find(o => o.value === r.visit_result);
                const dc = CUSTOMER_DECISION_OPTIONS.find(o => o.value === r.customer_decision);
                const na2 = NEXT_ACTION_OPTIONS.find(o => o.value === r.next_action);
                return (
                  <div key={r.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: `4px solid ${ro?.color || '#6b7280'}`, borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: ro?.color || 'var(--text-primary)' }}>{ro?.label || r.visit_result}</span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', gap: '0.75rem' }}>
                        <span>Visit: {fmtDate(r.visit_date)}</span>
                        <span>โดย: {r.visited_by_name_ref || r.visited_by_name || '-'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                      {r.site_condition && <div style={{ gridColumn: '1/-1' }}><b style={{ color: 'var(--text-tertiary)' }}>สภาพ: </b>{r.site_condition}</div>}
                      {r.work_scope_summary && <div style={{ gridColumn: '1/-1' }}><b style={{ color: 'var(--text-tertiary)' }}>ขอบเขต: </b>{r.work_scope_summary}</div>}
                      {r.estimated_budget != null && <div><b style={{ color: 'var(--text-tertiary)' }}>งบ: </b><span style={{ color: '#10b981', fontWeight: 700 }}>{Number(r.estimated_budget).toLocaleString('th-TH')} บาท</span></div>}
                      {r.customer_decision && <div><b style={{ color: 'var(--text-tertiary)' }}>ตัดสินใจ: </b>{dc?.label || r.customer_decision}</div>}
                      {r.customer_interest && <div style={{ gridColumn: '1/-1' }}><b style={{ color: 'var(--text-tertiary)' }}>ความต้องการ: </b>{r.customer_interest}</div>}
                    </div>
                    {r.next_action && r.next_action !== 'none' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.65rem', background: 'var(--bg-tertiary)', borderRadius: '6px', fontSize: '0.78rem' }}>
                        <ChevronRight size={12} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ color: 'var(--text-tertiary)' }}>ดำเนินการต่อ:</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{na2?.label || r.next_action}</span>
                        {r.next_action_date && <span style={{ color: 'var(--text-tertiary)' }}>— {new Date(r.next_action_date).toLocaleDateString('th-TH')}</span>}
                      </div>
                    )}
                    {r.internal_notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem' }}>🔒 {r.internal_notes}</div>}
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-tertiary)' }}>บันทึกเมื่อ {fmtDate(r.created_at)} โดย {r.created_by || '-'}</div>
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

export default SiteVisitResultModal;
