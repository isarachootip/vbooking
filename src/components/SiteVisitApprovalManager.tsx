import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { 
  Check, X, Clock, MapPin, Navigation, 
  ExternalLink, CheckCircle, AlertCircle, RefreshCw, Calendar, 
  UserCheck, ShieldCheck, ClipboardCheck
} from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';
import { SiteVisitResultModal } from './SiteVisitResultModal';

interface SiteVisitApprovalManagerProps {
  currentUser: User | null;
  users: User[];
  branches?: any[];
  onRefreshParent?: () => void;
}

export interface SiteVisitLead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude?: number | string | null;
  customer_longitude?: number | string | null;
  map_url?: string | null;
  job_type: string;
  status: string;
  branch?: string;
  appointment_date?: string | null;
  appointment_type?: string | null;
  appointment_assignee?: string | null;
  sales_contact_id?: string | null;
  sales_contact_name?: string | null;
  sales_contact_avatar?: string | null;
  coordinator_name?: string | null;
  coordinator_phone?: string | null;
  coordinator_line_id?: string | null;
  site_visit_approval_status?: 'None' | 'Pending' | 'Approved' | 'Rejected' | string;
  site_visit_approved_by?: string | null;
  site_visit_approved_at?: string | null;
  site_visit_approval_notes?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const SiteVisitApprovalManager: React.FC<SiteVisitApprovalManagerProps> = ({
  currentUser,
  users,
  branches = [],
  onRefreshParent
}) => {
  const [siteVisits, setSiteVisits] = useState<SiteVisitLead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('Pending');
  const [branchFilter, setBranchFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Action states for inline editing/assigning
  const [selectedSales, setSelectedSales] = useState<{ [leadId: string]: string }>({});
  const [actionNotes, setActionNotes] = useState<{ [leadId: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState<{ [leadId: string]: boolean }>({});
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Visit Result Modal State
  const [isVisitResultModalOpen, setIsVisitResultModalOpen] = useState(false);
  const [selectedLeadForVisitResult, setSelectedLeadForVisitResult] = useState<SiteVisitLead | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSiteVisits = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (branchFilter !== 'All') queryParams.append('branch', branchFilter);

      const res = await fetch(`/api/leads/site-visits?${queryParams.toString()}`, {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setSiteVisits(data || []);
        
        // Initialize selected sales mapping
        const initialSales: { [id: string]: string } = {};
        data.forEach((item: SiteVisitLead) => {
          if (item.sales_contact_id) {
            initialSales[item.id] = item.sales_contact_id;
          }
        });
        setSelectedSales(prev => ({ ...initialSales, ...prev }));
      }
    } catch (err) {
      console.error('Error fetching site visits:', err);
      showToast('ไม่สามารถดึงข้อมูลรายการนัดหมายได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteVisits();
  }, [statusFilter, branchFilter]);

  const handleApproveOrReject = async (leadId: string, approvalStatus: 'Approved' | 'Rejected') => {
    const salesId = selectedSales[leadId];
    const assignedUser = users.find(u => u.id === salesId);
    const notes = actionNotes[leadId] || '';

    if (approvalStatus === 'Approved' && !salesId) {
      alert('กรุณาเลือก Sales / ผู้รับผิดชอบที่จะไปพบลูกค้าก่อนกดอนุมัติ');
      return;
    }

    setIsProcessing(prev => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}/site-visit-approval`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({
          approval_status: approvalStatus,
          sales_contact_id: salesId || null,
          sales_contact_name: assignedUser ? assignedUser.name : null,
          approved_by: currentUser ? `${currentUser.name} (${currentUser.globalRole || 'GM'})` : 'GM สาขา',
          approval_notes: notes
        })
      });

      if (res.ok) {
        showToast(
          approvalStatus === 'Approved' 
            ? `✅ อนุมัตินัดหมายและมอบหมาย ${assignedUser?.name || 'Sales'} เรียบร้อยแล้ว` 
            : `❌ ปฏิเสธนัดหมายเรียบร้อยแล้ว`,
          'success'
        );
        fetchSiteVisits();
        if (onRefreshParent) onRefreshParent();
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
      }
    } catch (err) {
      console.error('Approval error:', err);
      showToast('ไม่สามารถดำเนินการได้', 'error');
    } finally {
      setIsProcessing(prev => ({ ...prev, [leadId]: false }));
    }
  };

  const filteredVisits = siteVisits.filter(v => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      (v.customer_name && v.customer_name.toLowerCase().includes(query)) ||
      (v.customer_phone && v.customer_phone.includes(query)) ||
      (v.customer_address && v.customer_address.toLowerCase().includes(query)) ||
      (v.job_type && v.job_type.toLowerCase().includes(query)) ||
      (v.branch && v.branch.toLowerCase().includes(query))
    );
  });

  const pendingCount = siteVisits.filter(v => v.site_visit_approval_status === 'Pending' || v.site_visit_approval_status === 'None' || !v.site_visit_approval_status).length;
  const approvedCount = siteVisits.filter(v => v.site_visit_approval_status === 'Approved').length;
  const rejectedCount = siteVisits.filter(v => v.site_visit_approval_status === 'Rejected').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* TOAST ALERT */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: toast.type === 'success' ? '#059669' : '#dc2626',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 99999,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* HEADER SECTION & STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(234, 88, 12, 0.12)', color: '#ea580c', padding: '0.75rem', borderRadius: '10px' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รายการนัดหมายทั้งหมด</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{siteVisits.length} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>รายการ</span></div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('Pending')}
          style={{ 
            background: statusFilter === 'Pending' ? 'rgba(234, 179, 8, 0.08)' : 'var(--bg-secondary)', 
            padding: '1rem 1.25rem', 
            borderRadius: '12px', 
            border: statusFilter === 'Pending' ? '2px solid #eab308' : '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', padding: '0.75rem', borderRadius: '10px' }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#ca8a04', fontWeight: 700 }}>🟡 รอ GM อนุมัติ & มอบหมาย</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ca8a04' }}>{pendingCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>รายการ</span></div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('Approved')}
          style={{ 
            background: statusFilter === 'Approved' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-secondary)', 
            padding: '1rem 1.25rem', 
            borderRadius: '12px', 
            border: statusFilter === 'Approved' ? '2px solid #10b981' : '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '0.75rem', borderRadius: '10px' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>🟢 อนุมัติออก Site แล้ว</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>{approvedCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>รายการ</span></div>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('Rejected')}
          style={{ 
            background: statusFilter === 'Rejected' ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)', 
            padding: '1rem 1.25rem', 
            borderRadius: '12px', 
            border: statusFilter === 'Rejected' ? '2px solid #ef4444' : '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#dc2626', padding: '0.75rem', borderRadius: '10px' }}>
            <X size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>🔴 ปฏิเสธนัดหมาย</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>{rejectedCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>รายการ</span></div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem 1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, flexWrap: 'wrap' }}>
          <input 
            type="text"
            placeholder="🔍 ค้นหาชื่อลูกค้า, เบอร์โทร, ที่อยู่หน้างาน, ประเภทงาน..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ minWidth: '260px', flex: 1, padding: '0.5rem 0.85rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '0.5rem 0.85rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}
          >
            <option value="All">ทุกสถานะการอนุมัติ</option>
            <option value="Pending">🟡 รออนุมัติ & มอบหมาย (Pending)</option>
            <option value="Approved">🟢 อนุมัติแล้ว (Approved)</option>
            <option value="Rejected">🔴 ปฏิเสธ (Rejected)</option>
          </select>

          <select
            value={branchFilter}
            onChange={e => setBranchFilter(e.target.value)}
            style={{ padding: '0.5rem 0.85rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}
          >
            <option value="All">ทุกสาขา</option>
            {branches.map(b => (
              <option key={b.id || b.code} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchSiteVisits}
          style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', padding: '0.5rem 0.85rem', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin-anim' : ''} /> รีเฟรชรายการ
        </button>
      </div>

      {/* APPOINTMENTS LIST / CARDS */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <RefreshCw size={24} className="spin-anim" style={{ margin: '0 auto 0.5rem auto' }} />
          <div>กำลังโหลดรายการนัดหมายออกพบลูกค้าภายนอก...</div>
        </div>
      ) : filteredVisits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <Calendar size={42} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
          <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>ไม่พบรายการนัดหมายออกพบลูกค้าหน้างานตามเงื่อนไขที่เลือก</h4>
          <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>เมื่อมีลูกค้าแจ้งขอนัดลงพื้นที่ site งาน รายการจะแสดงขึ้นที่หน้านี้เพื่อให้ GM สาขาทำการอนุมัติ</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredVisits.map(lead => {
            const isApproved = lead.site_visit_approval_status === 'Approved';
            const isRejected = lead.site_visit_approval_status === 'Rejected';
            const isPending = !isApproved && !isRejected;

            return (
              <div 
                key={lead.id}
                style={{
                  background: 'var(--bg-secondary)',
                  border: isPending ? '2px solid #eab308' : isApproved ? '1px solid #10b981' : '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}
              >
                {/* CARD HEADER */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#ea580c', color: 'white', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {lead.customer_name}
                        </h3>
                        <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', fontWeight: 700 }}>
                          {lead.job_type}
                        </span>
                        {lead.branch && (
                          <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            🏢 {lead.branch}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span>📞 <strong>{lead.customer_phone}</strong></span>
                        <span>• สร้างเมื่อ: {formatToDDMMYYYY(lead.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* APPROVAL STATUS BADGE */}
                  <div>
                    {isPending && (
                      <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Clock size={14} /> 🟡 รอ GM อนุมัติ & มอบหมาย Sales
                      </span>
                    )}
                    {isApproved && (
                      <span style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #a7f3d0', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={14} /> 🟢 GM อนุมัติแล้ว ({lead.site_visit_approved_by || 'GM'})
                      </span>
                    )}
                    {isRejected && (
                      <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <X size={14} /> 🔴 GM ปฏิเสธนัดหมาย
                      </span>
                    )}
                  </div>
                </div>

                {/* CARD BODY: APPOINTMENT & LOCATION DETAILS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  
                  {/* LEFT: SCHEDULE & ON-SITE DETAILS */}
                  <div style={{ background: 'rgba(234, 88, 12, 0.04)', padding: '0.85rem', borderRadius: '8px', border: '1px solid rgba(234, 88, 12, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#ea580c', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Calendar size={15} /> กำหนดการนัดหมายลงพื้นที่:
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      📅 {lead.appointment_date || 'ยังไม่ระบุวันเวลา'}
                    </div>
                    {lead.appointment_type && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        ประเภทนัด: <strong>{lead.appointment_type}</strong>
                      </div>
                    )}
                    {(lead.coordinator_name || lead.coordinator_phone || lead.coordinator_line_id) && (
                      <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px dashed rgba(234, 88, 12, 0.3)', fontSize: '0.78rem' }}>
                        <strong style={{ color: '#c2410c' }}>ผู้ประสานงานหน้างาน:</strong> {lead.coordinator_name || '-'} | 📞 {lead.coordinator_phone || '-'} | LINE: {lead.coordinator_line_id || '-'}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: SITE LOCATION & GPS */}
                  <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.825rem', fontWeight: 800, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Navigation size={15} /> พิกัดสถานที่หน้างาน (GIS & Location):
                      </div>
                      {lead.map_url || (lead.customer_latitude && lead.customer_longitude) ? (
                        <a 
                          href={lead.map_url || `https://www.google.com/maps?q=${lead.customer_latitude},${lead.customer_longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
                        >
                          <ExternalLink size={12} /> ดูบน Google Maps
                        </a>
                      ) : null}
                    </div>

                    <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      📍 {lead.customer_address || 'ไม่มีระบุที่อยู่'}
                    </div>

                    {lead.customer_latitude && lead.customer_longitude && (
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                        พิกัด: {lead.customer_latitude}, {lead.customer_longitude}
                      </div>
                    )}
                  </div>
                </div>

                {/* NOTES / REMARKS */}
                {lead.notes && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                    💬 <strong>หมายเหตุเพิ่มเติม:</strong> {lead.notes}
                  </div>
                )}

                {/* GM ACTION & ASSIGNMENT PANEL */}
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={16} color="#059669" /> 
                    การมอบหมาย Sales & การตัดสินใจของ GM สาขา:
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
                    {/* SALES ASSIGNEE SELECTOR */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        เลือก Sales / ผู้เชี่ยวชาญไปพบลูกค้าหน้างาน *
                      </label>
                      <select
                        value={selectedSales[lead.id] || lead.sales_contact_id || ''}
                        onChange={e => setSelectedSales(prev => ({ ...prev, [lead.id]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          fontWeight: 700
                        }}
                      >
                        <option value="">- เลือก Sales ที่จะไปพบลูกค้า -</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.globalRole || 'Sales'} - {u.department || 'ฝ่ายขาย'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* GM NOTE INPUT */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        ข้อความกำชับ / คำสั่งการจาก GM (ถ้ามี)
                      </label>
                      <input 
                        type="text"
                        placeholder="เช่น ให้พกแคตตาล็อกครัวและตัวอย่างกระเบื้องไปด้วย..."
                        value={actionNotes[lead.id] !== undefined ? actionNotes[lead.id] : (lead.site_visit_approval_notes || '')}
                        onChange={e => setActionNotes(prev => ({ ...prev, [lead.id]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          fontSize: '0.825rem'
                        }}
                      />
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={isProcessing[lead.id]}
                      onClick={() => handleApproveOrReject(lead.id, 'Rejected')}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        padding: '0.45rem 1rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <X size={15} /> ปฏิเสธนัดหมาย
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing[lead.id]}
                      onClick={() => handleApproveOrReject(lead.id, 'Approved')}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: 'white',
                        padding: '0.45rem 1.25rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)'
                      }}
                    >
                      <Check size={16} /> ✅ อนุมัตินัดหมาย & มอบหมาย Sales
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLeadForVisitResult(lead);
                        setIsVisitResultModalOpen(true);
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
                        border: 'none',
                        color: 'white',
                        padding: '0.45rem 1.15rem',
                        borderRadius: '6px',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)'
                      }}
                    >
                      <ClipboardCheck size={16} /> 📝 บันทึกผล Visit หน้างาน
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* SITE VISIT RESULT MODAL */}
      <SiteVisitResultModal
        isOpen={isVisitResultModalOpen}
        onClose={() => {
          setIsVisitResultModalOpen(false);
          setSelectedLeadForVisitResult(null);
        }}
        lead={selectedLeadForVisitResult}
        currentUser={currentUser}
        users={users}
        onSaved={() => {
          fetchSiteVisits();
          if (onRefreshParent) onRefreshParent();
        }}
      />

    </div>
  );
};
