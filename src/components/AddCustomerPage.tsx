import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Building2, Phone, Mail, MapPin, CreditCard,
  Settings2, ChevronRight, RotateCcw, Save, UserPlus,
  AlertCircle, CheckCircle2, ToggleLeft, ToggleRight, Navigation, Map, X
} from 'lucide-react';
import { GisMapPickerModal } from './GisMapPickerModal';

interface AddCustomerPageProps {
  currentUser?: any;
}

// ─── Section IDs ──────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'account',     label: 'Account',     icon: User },
  { id: 'contacts',    label: 'Contacts',    icon: Phone },
  { id: 'billing',     label: 'Billing',     icon: Building2 },
  { id: 'shipping',    label: 'Shipping',    icon: MapPin },
  { id: 'cards',       label: 'Cards',       icon: CreditCard },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
];

// ─── Generate customer ID ─────────────────────────────────────────────────────
const generateCustomerId = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CUS-${num}`;
};

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '0.875rem',
  color: '#111827',
  background: '#fff',
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 150ms',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  fontWeight: 600,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: '0.35rem',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '1.05rem',
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 0.25rem',
};

const sectionSubStyle: React.CSSProperties = {
  fontSize: '0.82rem',
  color: '#6b7280',
  margin: '0 0 1.5rem',
};

const sectionCardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  padding: '1.5rem',
  marginBottom: '1.5rem',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const AddCustomerPage: React.FC<AddCustomerPageProps> = ({ currentUser }) => {
  const navigate = useNavigate();

  // ── Auth helper
  const getAuthHeaders = () => {
    const userId = currentUser?.id || localStorage.getItem('userId') || '';
    return {
      'Content-Type': 'application/json',
      ...(userId ? { 'X-User-Id': userId } : {}),
    };
  };

  // ── Active sidebar section (scroll-spy)
  const [activeSection, setActiveSection] = useState('account');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // ── Form state — Account
  const [custFormType, setCustFormType] = useState<'individual' | 'corporate'>('individual');
  const [customerId]   = useState(generateCustomerId());
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [companyName, setCompanyName] = useState('');
  const [status,      setStatus]      = useState<'active' | 'inactive'>('active');
  const [source,      setSource]      = useState('Online store');
  const [accountOwner, setAccountOwner] = useState(
    currentUser ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() : ''
  );

  // ── Form state — Contacts
  const [preferredChannel, setPreferredChannel] = useState('EMAIL');
  const [marketingOptIn,   setMarketingOptIn]   = useState(true);
  const [phone,   setPhone]   = useState('');
  const [phone2,  setPhone2]  = useState('');
  const [lineId,  setLineId]  = useState('');
  const [email,   setEmail]   = useState('');

  // ── Form state — Billing
  const [billingName,    setBillingName]    = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxId,          setTaxId]          = useState('');
  const [billingPostal,  setBillingPostal]  = useState('');

  // ── Form state — Shipping (initial site)
  const [siteName,    setSiteName]    = useState('สถานที่หลัก (Site 1)');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteLat,     setSiteLat]     = useState('');
  const [siteLng,     setSiteLng]     = useState('');

  // ── Form state — Preferences
  const [notes, setNotes] = useState('');

  // ── GIS Modal
  const [isGisOpen, setIsGisOpen] = useState(false);

  // ── Submission state
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // ── Scroll-spy
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerTop = container.scrollTop;
    let current = 'account';
    SECTIONS.forEach(({ id }) => {
      const el = sectionRefs.current[id];
      if (el && el.offsetTop - container.offsetTop - 80 <= containerTop) {
        current = id;
      }
    });
    setActiveSection(current);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    const container = scrollContainerRef.current;
    if (el && container) {
      container.scrollTo({ top: el.offsetTop - container.offsetTop - 16, behavior: 'smooth' });
    }
  };

  // ── Reset form
  const handleReset = () => {
    setCustFormType('individual');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setStatus('active');
    setSource('Online store');
    setPreferredChannel('EMAIL');
    setMarketingOptIn(true);
    setPhone('');
    setPhone2('');
    setLineId('');
    setEmail('');
    setBillingName('');
    setBillingAddress('');
    setTaxId('');
    setBillingPostal('');
    setSiteName('สถานที่หลัก (Site 1)');
    setSiteAddress('');
    setSiteLat('');
    setSiteLng('');
    setNotes('');
  };

  // ── Save draft to localStorage
  const handleSaveDraft = () => {
    const draft = {
      custFormType, firstName, lastName, companyName, status, source, accountOwner,
      preferredChannel, marketingOptIn, phone, phone2, lineId, email,
      billingName, billingAddress, taxId, billingPostal,
      siteName, siteAddress, siteLat, siteLng, notes,
    };
    localStorage.setItem('addCustomerDraft', JSON.stringify(draft));
    setToast({ type: 'success', msg: 'บันทึก draft เรียบร้อย' });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!firstName.trim() && !companyName.trim()) {
      setToast({ type: 'error', msg: 'กรุณากรอกชื่อลูกค้าหรือชื่อบริษัท' });
      setTimeout(() => setToast(null), 4000);
      return;
    }

    setSaving(true);
    const payload: any = {
      customer_type: custFormType,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      customer_name:
        custFormType === 'corporate' && companyName
          ? companyName.trim()
          : `${firstName} ${lastName}`.trim(),
      company_name: companyName.trim() || null,
      tax_id: taxId.trim() || null,
      phone: phone.trim() || null,
      phone_secondary: phone2.trim() || null,
      line_id: lineId.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
      // Initial site
      site_name: siteName.trim() || 'สถานที่หลัก (Site 1)',
      address: siteAddress.trim() || null,
      latitude: siteLat ? parseFloat(siteLat) : null,
      longitude: siteLng ? parseFloat(siteLng) : null,
    };

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        localStorage.removeItem('addCustomerDraft');
        setToast({ type: 'success', msg: 'เพิ่มลูกค้าใหม่สำเร็จ!' });
        setTimeout(() => navigate('/customers'), 1200);
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ type: 'error', msg: err?.error || 'เกิดข้อผิดพลาดในการบันทึก' });
        setTimeout(() => setToast(null), 4000);
      }
    } catch {
      setToast({ type: 'error', msg: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  // ── Restore draft on mount
  useEffect(() => {
    const raw = localStorage.getItem('addCustomerDraft');
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.custFormType) setCustFormType(d.custFormType);
      if (d.firstName)    setFirstName(d.firstName);
      if (d.lastName)     setLastName(d.lastName);
      if (d.companyName)  setCompanyName(d.companyName);
      if (d.status)       setStatus(d.status);
      if (d.source)       setSource(d.source);
      if (d.accountOwner) setAccountOwner(d.accountOwner);
      if (d.preferredChannel) setPreferredChannel(d.preferredChannel);
      if (typeof d.marketingOptIn === 'boolean') setMarketingOptIn(d.marketingOptIn);
      if (d.phone)   setPhone(d.phone);
      if (d.phone2)  setPhone2(d.phone2);
      if (d.lineId)  setLineId(d.lineId);
      if (d.email)   setEmail(d.email);
      if (d.billingName)    setBillingName(d.billingName);
      if (d.billingAddress) setBillingAddress(d.billingAddress);
      if (d.taxId)          setTaxId(d.taxId);
      if (d.billingPostal)  setBillingPostal(d.billingPostal);
      if (d.siteName)    setSiteName(d.siteName);
      if (d.siteAddress) setSiteAddress(d.siteAddress);
      if (d.siteLat)     setSiteLat(d.siteLat);
      if (d.siteLng)     setSiteLng(d.siteLng);
      if (d.notes)       setNotes(d.notes);
    } catch { /* ignore */ }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f9fafb', overflow: 'hidden' }}>

      {/* ── TOP ACTION BAR ─────────────────────────────────────────────────── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        gap: '1rem',
      }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#6b7280' }}>
          <span
            onClick={() => navigate('/customers')}
            style={{ cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}
          >
            Customers
          </span>
          <ChevronRight size={14} />
          <span style={{ color: '#111827', fontWeight: 600 }}>Add Customer</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <RotateCcw size={14} /> Reset form
          </button>

          <button
            type="button"
            onClick={handleSaveDraft}
            style={{
              background: '#fff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.45rem 1rem',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#374151',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <Save size={14} /> Save draft
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              background: saving ? '#6d28d9' : '#7c3aed',
              border: 'none',
              borderRadius: '8px',
              padding: '0.45rem 1.1rem',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#fff',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              opacity: saving ? 0.8 : 1,
            }}
          >
            <UserPlus size={14} /> {saving ? 'กำลังบันทึก...' : 'Create customer'}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── LEFT SIDEBAR ───────────────────────────────────────────────── */}
        <aside style={{
          width: '200px',
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #e5e7eb',
          padding: '1.25rem 0.75rem',
          overflowY: 'auto',
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {SECTIONS.map(({ id, label, icon: Icon }) => {
              const isActive = activeSection === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollToSection(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: isActive ? '#111827' : 'transparent',
                    color: isActive ? '#fff' : '#4b5563',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 150ms',
                    width: '100%',
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── SCROLL AREA ────────────────────────────────────────────────── */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.5rem',
          }}
        >
          {/* Page heading */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>
              Add New Customer
            </h1>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
              Add the account, contacts, addresses, and payment methods the team needs to operate this customer.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ maxWidth: '820px' }}>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 1 — ACCOUNT
            ═══════════════════════════════════════════════════════════════ */}
            <div
              ref={el => { sectionRefs.current['account'] = el; }}
              style={sectionCardStyle}
            >
              <h2 style={sectionHeadingStyle}>Account</h2>
              <p style={sectionSubStyle}>Identity, source, and internal ownership for this customer record.</p>

              {/* Customer Type */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={labelStyle}>ประเภทลูกค้า</label>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                  {(['individual', 'corporate'] as const).map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="custType"
                        value={t}
                        checked={custFormType === t}
                        onChange={() => setCustFormType(t)}
                      />
                      {t === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล / บริษัท'}
                    </label>
                  ))}
                </div>
              </div>

              {/* First Name / Last Name / Customer ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={labelStyle}>First Name <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="เช่น สมชาย"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="เช่น ใจดี"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Customer ID</label>
                  <input
                    style={{ ...inputStyle, background: '#f3f4f6', color: '#6b7280', cursor: 'default' }}
                    type="text"
                    value={customerId}
                    readOnly
                  />
                </div>
              </div>

              {/* Company (shown for corporate) */}
              {custFormType === 'corporate' && (
                <div style={{ marginBottom: '0.85rem' }}>
                  <label style={labelStyle}>Company <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="เช่น บริษัท เอสซีจี จำกัด (มหาชน)"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>
              )}

              {/* Status / Source */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    style={inputStyle}
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Source</label>
                  <select
                    style={inputStyle}
                    value={source}
                    onChange={e => setSource(e.target.value)}
                  >
                    {['Online store', 'Referral', 'Walk-in', 'Social media', 'Cold call', 'Other'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Account Owner */}
              <div>
                <label style={labelStyle}>Account Owner</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="ชื่อเจ้าของ account / ผู้ดูแล"
                  value={accountOwner}
                  onChange={e => setAccountOwner(e.target.value)}
                />
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 2 — CONTACTS
            ═══════════════════════════════════════════════════════════════ */}
            <div
              ref={el => { sectionRefs.current['contacts'] = el; }}
              style={sectionCardStyle}
            >
              <h2 style={sectionHeadingStyle}>Contacts</h2>
              <p style={sectionSubStyle}>Keep the real people and preferred communication path attached to the account.</p>

              {/* Primary channel / Preferred channel / Marketing opt-in */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem', alignItems: 'start' }}>
                <div>
                  <label style={labelStyle}>Primary channel</label>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                    Choose how the team usually reaches this customer.
                  </p>
                </div>
                <div>
                  <label style={labelStyle}>Preferred Channel</label>
                  <select
                    style={inputStyle}
                    value={preferredChannel}
                    onChange={e => setPreferredChannel(e.target.value)}
                  >
                    {['EMAIL', 'PHONE', 'LINE', 'SMS', 'WALK-IN'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Marketing opt-in</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="button"
                      onClick={() => setMarketingOptIn(v => !v)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: marketingOptIn ? '#7c3aed' : '#9ca3af' }}
                    >
                      {marketingOptIn ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                    <span style={{ fontSize: '0.8rem', color: '#374151' }}>
                      {marketingOptIn ? 'Include this customer in campaign sends' : 'Excluded from campaigns'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone / Phone2 / LINE / Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Phone <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="081-xxx-xxxx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Phone (Secondary)</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="082-xxx-xxxx"
                    value={phone2}
                    onChange={e => setPhone2(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>LINE ID</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="@line-id"
                    value={lineId}
                    onChange={e => setLineId(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="customer@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 3 — BILLING
            ═══════════════════════════════════════════════════════════════ */}
            <div
              ref={el => { sectionRefs.current['billing'] = el; }}
              style={sectionCardStyle}
            >
              <h2 style={sectionHeadingStyle}>Billing</h2>
              <p style={sectionSubStyle}>ที่อยู่สำหรับออกใบเสร็จ / ใบกำกับภาษี</p>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>ชื่อ/บริษัทในใบเสร็จ</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="ชื่อที่ต้องการให้ปรากฏในใบเสร็จ"
                  value={billingName}
                  onChange={e => setBillingName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>ที่อยู่ออกใบเสร็จ</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด รหัสไปรษณีย์"
                  value={billingAddress}
                  onChange={e => setBillingAddress(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={labelStyle}>Tax ID (เลขประจำตัวผู้เสียภาษี)</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="13 หลัก"
                    value={taxId}
                    onChange={e => setTaxId(e.target.value)}
                    maxLength={13}
                  />
                </div>
                <div>
                  <label style={labelStyle}>รหัสไปรษณีย์</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="10xxx"
                    value={billingPostal}
                    onChange={e => setBillingPostal(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 4 — SHIPPING / SITE
            ═══════════════════════════════════════════════════════════════ */}
            <div
              ref={el => { sectionRefs.current['shipping'] = el; }}
              style={sectionCardStyle}
            >
              <h2 style={sectionHeadingStyle}>Shipping / Site</h2>
              <p style={sectionSubStyle}>สถานที่ติดตั้งหรือส่งของ (Initial Site) — ลูกค้า 1 รายสามารถมีได้หลายไซต์</p>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>ชื่อไซต์</label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="เช่น บ้านพักหลัก, สำนักงานใหญ่"
                  value={siteName}
                  onChange={e => setSiteName(e.target.value)}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={labelStyle}>ที่อยู่ไซต์</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={3}
                  placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด"
                  value={siteAddress}
                  onChange={e => setSiteAddress(e.target.value)}
                />
              </div>

              {/* GIS Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsGisOpen(true)}
                  style={{
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#92400e',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                  }}
                >
                  <Map size={14} /> ปักหมุดแผนที่ GIS
                </button>
                {(siteLat || siteLng) && (
                  <span style={{ fontSize: '0.78rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Navigation size={12} /> {siteLat}, {siteLng}
                  </span>
                )}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 5 — CARDS  (placeholder)
            ═══════════════════════════════════════════════════════════════ */}
            <div
              ref={el => { sectionRefs.current['cards'] = el; }}
              style={{ ...sectionCardStyle, background: '#f9fafb' }}
            >
              <h2 style={sectionHeadingStyle}>Cards</h2>
              <p style={sectionSubStyle}>Payment cards and credit limits for this customer.</p>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '10px',
                padding: '2rem',
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: '0.85rem',
              }}>
                <CreditCard size={28} style={{ marginBottom: '0.5rem', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>ยังไม่มีบัตรชำระเงิน — สามารถเพิ่มได้หลังจากสร้างลูกค้าแล้ว</p>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 6 — PREFERENCES
            ═══════════════════════════════════════════════════════════════ */}
            <div
              ref={el => { sectionRefs.current['preferences'] = el; }}
              style={sectionCardStyle}
            >
              <h2 style={sectionHeadingStyle}>Preferences</h2>
              <p style={sectionSubStyle}>หมายเหตุ / ข้อควรทราบเพิ่มเติมสำหรับทีมงาน</p>

              <div>
                <label style={labelStyle}>Notes / หมายเหตุ</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical' }}
                  rows={4}
                  placeholder="เช่น ลูกค้าชอบติดต่อช่วงเย็น, มีสุนัขในบ้าน, ต้องการใบกำกับภาษีทุกครั้ง..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            </div>

            {/* ── Bottom Action Bar ───────────────────────────────────────── */}
            <div style={{
              background: '#fff',
              borderTop: '1px solid #e5e7eb',
              padding: '1rem 0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.6rem',
              maxWidth: '820px',
            }}>
              <button
                type="button"
                onClick={() => navigate('/customers')}
                style={{
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: saving ? '#6d28d9' : '#7c3aed',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.5rem 1.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  opacity: saving ? 0.8 : 1,
                }}
              >
                <UserPlus size={16} /> {saving ? 'กำลังบันทึก...' : 'Create customer'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* ── GIS Modal ──────────────────────────────────────────────────────── */}
      {isGisOpen && (
        <GisMapPickerModal
          isOpen={isGisOpen}
          initialLat={siteLat || undefined}
          initialLng={siteLng || undefined}
          initialAddress={siteAddress || undefined}
          onSelectLocation={(lat: string, lng: string, address?: string) => {
            setSiteLat(lat);
            setSiteLng(lng);
            if (address && !siteAddress) setSiteAddress(address);
            setIsGisOpen(false);
          }}
          onClose={() => setIsGisOpen(false)}
        />
      )}

      {/* ── Toast notification ─────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          background: toast.type === 'success' ? '#059669' : '#dc2626',
          color: '#fff',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          maxWidth: '360px',
          animation: 'fadeInUp 200ms ease',
        }}>
          {toast.type === 'success'
            ? <CheckCircle2 size={18} />
            : <AlertCircle size={18} />
          }
          {toast.msg}
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto', padding: 0 }}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AddCustomerPage;
