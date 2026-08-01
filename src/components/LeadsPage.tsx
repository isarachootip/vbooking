import { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle2, RefreshCw, X, Search, FileText, Phone, Building, Edit2, MapPin, Navigation, ExternalLink, Compass } from 'lucide-react';
import type { User } from '../types';
import { formatToDDMMYYYY } from '../utils';

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude?: number | string | null;
  customer_longitude?: number | string | null;
  map_url?: string | null;
  job_type: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
  building_type?: string;
  area_size?: string;
  initial_budget?: string;
  payment_method?: string;
  work_areas?: string[];
  required_work_types?: string[];
  branch?: string;
}

interface LeadsPageProps {
  currentUser: User | null;
}

export const LeadsPage = ({ currentUser }: LeadsPageProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');

  // Form states matching Image 2 mockup
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLatitude, setCustomerLatitude] = useState<string>('');
  const [customerLongitude, setCustomerLongitude] = useState<string>('');
  const [mapUrl, setMapUrl] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [jobType, setJobType] = useState('Quick Service');
  const [status, setStatus] = useState('New');
  const [branch, setBranch] = useState('สาขาบางนา');
  const [buildingType, setBuildingType] = useState('บ้านเดี่ยว');
  const [areaSize, setAreaSize] = useState('');
  const [initialBudget, setInitialBudget] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('โอนเข้าบัญชีธนาคาร');
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [requiredWorkTypes, setRequiredWorkTypes] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setCustomerLatitude(lat);
        setCustomerLongitude(lng);
        const generatedMapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setMapUrl(generatedMapUrl);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงสิทธิ์ตำแหน่งตำแหน่งที่ตั้ง (Location Permission)');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenGoogleMaps = () => {
    if (mapUrl) {
      window.open(mapUrl, '_blank');
    } else if (customerLatitude && customerLongitude) {
      window.open(`https://www.google.com/maps?q=${customerLatitude},${customerLongitude}`, '_blank');
    } else if (customerAddress) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(customerAddress)}`, '_blank');
    } else {
      alert('กรุณากรอกที่อยู่ หรือพิกัด ละติจูด/ลองจิจูด ก่อนเปิดแผนที่');
    }
  };

  const toggleWorkArea = (area: string) => {
    setWorkAreas(prev => 
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  const toggleRequiredWorkType = (type: string) => {
    setRequiredWorkTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const extraDetails = {
      buildingType,
      areaSize,
      initialBudget,
      paymentMethod,
      workAreas,
      requiredWorkTypes,
      branch
    };

    const combinedNotes = notes ? `${notes}\n\n[Details]: ${JSON.stringify(extraDetails)}` : `[Details]: ${JSON.stringify(extraDetails)}`;

    const leadData = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      customer_latitude: customerLatitude ? parseFloat(customerLatitude) : null,
      customer_longitude: customerLongitude ? parseFloat(customerLongitude) : null,
      map_url: mapUrl || (customerLatitude && customerLongitude ? `https://www.google.com/maps?q=${customerLatitude},${customerLongitude}` : null),
      job_type: jobType,
      status: status,
      notes: combinedNotes,
    };

    try {
      let response;
      if (editingLead) {
        response = await fetch(`/api/leads/${editingLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });
      } else {
        response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });
      }

      if (response.ok) {
        setIsModalOpen(false);
        fetchLeads();
      } else {
        alert('Failed to save lead');
      }
    } catch (err) {
      console.error('Error saving lead', err);
    }
  };

  const handleConvert = async (leadId: string) => {
    if (!confirm('ยืนยันแปลงลูกค้ารายนี้เป็นโปรเจกต์ใหม่? ระบบจะสร้าง Tasks ให้อัตโนมัติตามประเภทงาน')) return;
    
    try {
      const response = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id }),
      });
      
      if (response.ok) {
        alert('แปลงเป็นโปรเจกต์สำเร็จ!');
        fetchLeads();
      } else {
        const data = await response.json();
        alert('เกิดข้อผิดพลาด: ' + data.error);
      }
    } catch (err) {
      console.error('Error converting lead', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const openModal = (lead: Lead | null = null) => {
    if (lead) {
      setEditingLead(lead);
      setCustomerName(lead.customer_name);
      setCustomerPhone(lead.customer_phone || '');
      setCustomerAddress(lead.customer_address || '');
      setCustomerLatitude(lead.customer_latitude ? String(lead.customer_latitude) : '');
      setCustomerLongitude(lead.customer_longitude ? String(lead.customer_longitude) : '');
      setMapUrl(lead.map_url || '');
      setJobType(lead.job_type);
      setStatus(lead.status);

      // Extract extra details if available
      try {
        if (lead.notes && lead.notes.includes('[Details]:')) {
          const parts = lead.notes.split('[Details]:');
          setNotes(parts[0].trim());
          const details = JSON.parse(parts[1].trim());
          setBuildingType(details.buildingType || 'บ้านเดี่ยว');
          setAreaSize(details.areaSize || '');
          setInitialBudget(details.initialBudget || '');
          setPaymentMethod(details.paymentMethod || 'โอนเข้าบัญชีธนาคาร');
          setWorkAreas(details.workAreas || []);
          setRequiredWorkTypes(details.requiredWorkTypes || []);
          setBranch(details.branch || 'สาขาบางนา');
        } else {
          setNotes(lead.notes || '');
        }
      } catch {
        setNotes(lead.notes || '');
      }
    } else {
      setEditingLead(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerLatitude('');
      setCustomerLongitude('');
      setMapUrl('');
      setJobType('Quick Service');
      setStatus('New');
      setBranch('สาขาบางนา');
      setBuildingType('บ้านเดี่ยว');
      setAreaSize('');
      setInitialBudget('');
      setPaymentMethod('โอนเข้าบัญชีธนาคาร');
      setWorkAreas([]);
      setRequiredWorkTypes([]);
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700 }}>New (ใหม่)</span>;
      case 'Contacted':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontSize: '0.75rem', fontWeight: 700 }}>Contacted (ติดต่อแล้ว)</span>;
      case 'Qualified':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(147, 51, 234, 0.15)', color: '#9333ea', fontSize: '0.75rem', fontWeight: 700 }}>Qualified (รอสำรวจ)</span>;
      case 'Converted':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>Converted (เป็นงานแล้ว)</span>;
      case 'Lost':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>Lost (ยกเลิก)</span>;
      default:
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (l.customer_phone && l.customer_phone.includes(searchTerm)) ||
                          (l.customer_address && l.customer_address.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesJobType = jobTypeFilter === 'All' || l.job_type === jobTypeFilter;
    return matchesSearch && matchesStatus && matchesJobType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      
      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--accent-primary)" />
            รายชื่อลูกค้ามุ่งหวัง (Leads Management)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            จัดการข้อมูลลูกค้า บันทึกพิกัดแผนที่ (GPS) ติดตามสถานะความสนใจ และแปลงข้อมูลเป็นโครงการติดตั้ง
          </p>
        </div>
        
        <button 
          onClick={() => openModal()} 
          style={{ 
            background: 'var(--accent-primary)', 
            color: 'white', 
            border: 'none', 
            padding: '0.6rem 1.25rem', 
            borderRadius: 'var(--radius-md)', 
            fontWeight: 700, 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
          }} 
          className="hover-lift"
        >
          <Plus size={18} /> + เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* ── SUMMARY KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Leads ทั้งหมด</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#2563eb" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {leads.length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ราย</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ลูกค้าใหม่ (New)</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={18} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6' }}>
            {leads.filter(l => l.status === 'New').length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ราย</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รอสำรวจ/ยืนยัน</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(147, 51, 234, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={18} color="#9333ea" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#9333ea' }}>
            {leads.filter(l => l.status === 'Qualified' || l.status === 'Contacted').length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ราย</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>แปลงเป็นโปรเจกต์สำเร็จ</span>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
            {leads.filter(l => l.status === 'Converted').length} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>ราย</span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, ที่อยู่, พิกัด..."
            style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.2rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
          />
        </div>

        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
        >
          <option value="All">สถานะทั้งหมด</option>
          <option value="New">New (ใหม่)</option>
          <option value="Contacted">Contacted (ติดต่อแล้ว)</option>
          <option value="Qualified">Qualified (รอสำรวจ)</option>
          <option value="Converted">Converted (เป็นโปรเจกต์แล้ว)</option>
          <option value="Lost">Lost (ยกเลิก)</option>
        </select>

        <select 
          value={jobTypeFilter}
          onChange={e => setJobTypeFilter(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
        >
          <option value="All">ประเภทงานทั้งหมด</option>
          <option value="Quick Service">Quick Service (งานซ่อมด่วน)</option>
          <option value="Installation">Installation (งานติดตั้ง)</option>
          <option value="Renovation">Renovation (งานรีโนเวท)</option>
        </select>
      </div>

      {/* ── LEADS TABLE ── */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600 }}>
                <th style={{ padding: '0.85rem 1rem' }}>ชื่อลูกค้า / ที่อยู่</th>
                <th style={{ padding: '0.85rem 1rem' }}>พิกัดหน้างาน (Map/GPS)</th>
                <th style={{ padding: '0.85rem 1rem' }}>การติดต่อ</th>
                <th style={{ padding: '0.85rem 1rem' }}>ประเภทงาน</th>
                <th style={{ padding: '0.85rem 1rem' }}>สถานะ</th>
                <th style={{ padding: '0.85rem 1rem' }}>วันที่บันทึก</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ไม่พบข้อมูลลูกค้ามุ่งหวัง
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }} className="table-row-hover">
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{lead.customer_name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{lead.customer_address || 'ไม่ระบุที่อยู่'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {lead.customer_latitude && lead.customer_longitude ? (
                        <a 
                          href={lead.map_url || `https://www.google.com/maps?q=${lead.customer_latitude},${lead.customer_longitude}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          <MapPin size={13} /> {lead.customer_latitude}, {lead.customer_longitude} <ExternalLink size={11} />
                        </a>
                      ) : lead.map_url ? (
                        <a 
                          href={lead.map_url} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}
                        >
                          <MapPin size={13} /> ดูแผนที่ Google Maps <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>- ไม่ได้ปักพิกัด -</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Phone size={14} color="var(--accent-primary)" /> {lead.customer_phone || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.78rem' }}>
                        {lead.job_type}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getStatusBadge(lead.status)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                      {formatToDDMMYYYY(lead.created_at)}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {lead.status !== 'Converted' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => openModal(lead)}
                            style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Edit2 size={13} /> แก้ไข
                          </button>
                          <button
                            onClick={() => handleConvert(lead.id)}
                            style={{ padding: '0.35rem 0.65rem', borderRadius: 'var(--radius-md)', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <RefreshCw size={13} /> แปลงเป็นงาน
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                          <CheckCircle2 size={15} /> เป็นโปรเจกต์แล้ว
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RICH LEAD FORM MODAL WITH MAP/GPS INTEGRATION ── */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ 
            padding: '1.75rem 2rem', 
            width: '1150px', 
            maxWidth: '98%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem', 
            maxHeight: '94vh', 
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            
            {/* Modal Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={24} color="var(--accent-primary)" />
                {editingLead ? 'แก้ไขข้อมูลลูกค้ามุ่งหวัง' : 'บันทึกข้อมูลลูกค้าใหม่ (Lead Entry)'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={24} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
                
                {/* ── LEFT COLUMN: ข้อมูลทั่วไป & พิกัดแผนที่ (GPS) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* SECTION 1: ข้อมูลทั่วไปของลูกค้า */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                      <FileText size={18} /> ข้อมูลทั่วไปของลูกค้า
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          ชื่อลูกค้า *
                        </label>
                        <input 
                          type="text" 
                          required
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          placeholder="เช่น คุณสำราญ ศักดิ์ดี"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          เบอร์โทรติดต่อ *
                        </label>
                        <input 
                          type="text" 
                          required
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          placeholder="093-265-2639"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          สาขาที่ดูแล *
                        </label>
                        <select
                          value={branch}
                          onChange={e => setBranch(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        >
                          <option value="สาขาบางนา">สาขาบางนา</option>
                          <option value="สาขารัชดา">สาขารัชดา</option>
                          <option value="สาขาบางพลี">สาขาบางพลี</option>
                          <option value="สาขาพระราม 3">สาขาพระราม 3</option>
                          <option value="สาขาธนบุรี">สาขาธนบุรี</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          สถานะ Lead
                        </label>
                        <select
                          value={status}
                          onChange={e => setStatus(e.target.value)}
                          disabled={status === 'Converted'}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        >
                          <option value="New">New (ใหม่)</option>
                          <option value="Contacted">Contacted (ติดต่อแล้ว)</option>
                          <option value="Qualified">Qualified (รอลงสำรวจ)</option>
                          <option value="Lost">Lost (ยกเลิก)</option>
                          {status === 'Converted' && <option value="Converted">Converted (แปลงเป็นงานแล้ว)</option>}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        ที่อยู่ / พิกัดสถานที่หน้างาน
                      </label>
                      <textarea 
                        rows={2}
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        placeholder="เช่น 123/45 หมู่บ้านสุขสันต์ ถนนบางนา-ตราด แขวงบางนา..."
                        style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* SECTION: MAP & GPS LOCATION PICKER (เหมือน VBOOKING) */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={16} /> บันทึกพิกัดแผนที่ (GPS Map Coordinates)
                        </span>
                        <button
                          type="button"
                          onClick={handleGetCurrentLocation}
                          disabled={isGettingLocation}
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981', borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Compass size={13} /> {isGettingLocation ? 'กำลังดึงพิกัด...' : '📍 ดึงพิกัดปัจจุบัน (GPS)'}
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ละติจูด (Latitude)</label>
                          <input 
                            type="text" 
                            value={customerLatitude}
                            onChange={e => setCustomerLatitude(e.target.value)}
                            placeholder="13.756331"
                            style={{ width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ลองจิจูด (Longitude)</label>
                          <input 
                            type="text" 
                            value={customerLongitude}
                            onChange={e => setCustomerLongitude(e.target.value)}
                            placeholder="100.501862"
                            style={{ width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
                          <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ลิงก์หมุดแผนที่ (Google Maps URL)</label>
                          <button
                            type="button"
                            onClick={handleOpenGoogleMaps}
                            style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
                          >
                            <Navigation size={12} /> 🗺️ ทดสอบเปิดแผนที่
                          </button>
                        </div>
                        <input 
                          type="text" 
                          value={mapUrl}
                          onChange={e => setMapUrl(e.target.value)}
                          placeholder="https://maps.google.com/?q=13.7563,100.5018"
                          style={{ width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>

                  </div>

                  {/* SECTION 2: หมายเหตุ & บันทึกเพิ่มเติม */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                      <FileText size={18} /> หมายเหตุ / บันทึกเพิ่มเติมจากเซลล์
                    </div>
                    <textarea 
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="ระบุข้อกังวลของลูกค้า ความต้องการพิเศษ หรือรายละเอียดการคุยเบื้องต้น..."
                      style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                    />
                  </div>

                </div>

                {/* ── RIGHT COLUMN: ข้อมูลความต้องการของลูกค้า (PURPLE THEME) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', fontWeight: 700, fontSize: '1rem' }}>
                      <Building size={18} /> ข้อมูลความต้องการของลูกค้า
                    </div>

                    {/* ประเภทงาน & ประเภทสิ่งก่อสร้าง */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          ประเภทงาน *
                        </label>
                        <select
                          value={jobType}
                          onChange={e => setJobType(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 700 }}
                        >
                          <option value="Quick Service">Quick Service (งานซ่อมด่วน)</option>
                          <option value="Installation">Installation (งานติดตั้ง)</option>
                          <option value="Renovation">Renovation (งานรีโนเวท)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          ประเภทสิ่งก่อสร้าง *
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '0.35rem' }}>
                          {['บ้านเดี่ยว', 'คอนโด', 'อาคารพาณิชย์', 'อื่นๆ'].map((type) => (
                            <label key={type} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                              <input 
                                type="radio" 
                                name="buildingType"
                                checked={buildingType === type}
                                onChange={() => setBuildingType(type)}
                              />
                              {type}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ขนาดพื้นที่ & งบประมาณ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          ขนาดพื้นที่ (ตร.ม.)
                        </label>
                        <input 
                          type="text"
                          value={areaSize}
                          onChange={e => setAreaSize(e.target.value)}
                          placeholder="ระบุขนาดพื้นที่"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          งบประมาณเบื้องต้น (บาท)
                        </label>
                        <input 
                          type="text"
                          value={initialBudget}
                          onChange={e => setInitialBudget(e.target.value)}
                          placeholder="ระบุจำนวนเงิน"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    {/* วิธีการชำระเงิน */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        วิธีการชำระเงินที่ต้องการ
                      </label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.25rem' }}>
                        {['โอนเข้าบัญชีธนาคาร', 'เงินสด', 'ผ่อนชำระ (Installment)', 'บัตรเครดิต'].map((method) => (
                          <label key={method} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.30rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                            <input 
                              type="radio" 
                              name="paymentMethod"
                              checked={paymentMethod === method}
                              onChange={() => setPaymentMethod(method)}
                            />
                            {method}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* พื้นที่งาน Checkboxes Panel */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>พื้นที่งาน (Work Areas)</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                        {[
                          'ห้องรับแขก', 'ห้องครัว', 'ห้องน้ำ/ห้องส้วม',
                          'ลาน/สนามหญ้า', 'ลานซักล้าง', 'ตกแต่งภายนอก',
                          'ห้องนอน', 'ห้องโถง/ห้องรับแขก', 'สำนักงาน/ออฟฟิศ',
                          'ลานจอดรถ'
                        ].map((area) => (
                          <label key={area} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox"
                              checked={workAreas.includes(area)}
                              onChange={() => toggleWorkArea(area)}
                            />
                            {area}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* ประเภทงานที่ต้องการ Checkboxes Panel */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>ประเภทงานที่ต้องการ</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                        {[
                          'งานไฟฟ้า', 'งานออกแบบ', 'งานป้องกัน',
                          'งานประปา', 'งานติดตั้ง', 'งานอื่นๆ'
                        ].map((type) => (
                          <label key={type} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox"
                              checked={requiredWorkTypes.includes(type)}
                              onChange={() => toggleRequiredWorkType(type)}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-md)', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                  className="hover-lift"
                >
                  บันทึกข้อมูลลูกค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
