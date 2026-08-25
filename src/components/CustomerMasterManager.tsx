import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, User, Phone, Mail, MapPin, Plus, Search, 
  Edit, Trash2, ChevronDown, ChevronUp, Check, ExternalLink, 
  Map, Sparkles, Navigation, X, ShieldAlert, FileText, ArrowRight
} from 'lucide-react';
import type { Customer, CustomerSite } from '../types';
import { GisMapPickerModal } from './GisMapPickerModal';

interface CustomerMasterManagerProps {
  currentUser?: any;
}

export const CustomerMasterManager: React.FC<CustomerMasterManagerProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'individual' | 'corporate'>('all');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  // Customer Modal state
  const [isCustModalOpen, setIsCustModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custFormType, setCustFormType] = useState<'individual' | 'corporate'>('individual');
  const [custFirstName, setCustFirstName] = useState<string>('');
  const [custLastName, setCustLastName] = useState<string>('');
  const [custCompanyName, setCustCompanyName] = useState<string>('');
  const [custTaxId, setCustTaxId] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custPhone2, setCustPhone2] = useState<string>('');
  const [custLineId, setCustLineId] = useState<string>('');
  const [custEmail, setCustEmail] = useState<string>('');
  const [custNotes, setCustNotes] = useState<string>('');

  // Initial site in customer modal (only for new customer)
  const [initSiteName, setInitSiteName] = useState<string>('สถานที่หลัก (Site 1)');
  const [initSiteAddress, setInitSiteAddress] = useState<string>('');
  const [initSiteLat, setInitSiteLat] = useState<string>('');
  const [initSiteLng, setInitSiteLng] = useState<string>('');

  // Site Modal state
  const [isSiteModalOpen, setIsSiteModalOpen] = useState<boolean>(false);
  const [activeCustomerForSite, setActiveCustomerForSite] = useState<Customer | null>(null);
  const [editingSite, setEditingSite] = useState<CustomerSite | null>(null);
  const [siteName, setSiteName] = useState<string>('');
  const [siteIsDefault, setSiteIsDefault] = useState<boolean>(false);
  const [siteAddress, setSiteAddress] = useState<string>('');
  const [siteLat, setSiteLat] = useState<string>('');
  const [siteLng, setSiteLng] = useState<string>('');
  const [siteMapUrl, setSiteMapUrl] = useState<string>('');
  const [siteCoordName, setSiteCoordName] = useState<string>('');
  const [siteCoordPhone, setSiteCoordPhone] = useState<string>('');
  const [siteCoordLine, setSiteCoordLine] = useState<string>('');
  const [siteNotes, setSiteNotes] = useState<string>('');

  // GIS Picker Modal
  const [isGisModalOpen, setIsGisModalOpen] = useState<boolean>(false);
  const [gisTarget, setGisTarget] = useState<'init_site' | 'site_form'>('site_form');

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomerSites = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/sites`);
      if (res.ok) {
        const sites = await res.json();
        setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, sites } : c));
      }
    } catch (err) {
      console.error('Error fetching sites:', err);
    }
  };

  const handleToggleExpand = (customerId: string) => {
    if (expandedCustomerId === customerId) {
      setExpandedCustomerId(null);
    } else {
      setExpandedCustomerId(customerId);
      fetchCustomerSites(customerId);
    }
  };

  // Open Add/Edit Customer Modal
  const handleOpenCustModal = (cust?: Customer) => {
    if (cust) {
      setEditingCustomer(cust);
      setCustFormType(cust.customerType || 'individual');
      setCustFirstName(cust.firstName || '');
      setCustLastName(cust.lastName || '');
      setCustCompanyName(cust.companyName || '');
      setCustTaxId(cust.taxId || '');
      setCustPhone(cust.phone || '');
      setCustPhone2(cust.phoneSecondary || '');
      setCustLineId(cust.lineId || '');
      setCustEmail(cust.email || '');
      setCustNotes(cust.notes || '');
      setInitSiteName('');
      setInitSiteAddress('');
      setInitSiteLat('');
      setInitSiteLng('');
    } else {
      setEditingCustomer(null);
      setCustFormType('individual');
      setCustFirstName('');
      setCustLastName('');
      setCustCompanyName('');
      setCustTaxId('');
      setCustPhone('');
      setCustPhone2('');
      setCustLineId('');
      setCustEmail('');
      setCustNotes('');
      setInitSiteName('สถานที่หลัก (Site 1)');
      setInitSiteAddress('');
      setInitSiteLat('');
      setInitSiteLng('');
    }
    setIsCustModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      customer_type: custFormType,
      first_name: custFirstName.trim(),
      last_name: custLastName.trim(),
      customer_name: custFormType === 'corporate' && custCompanyName 
        ? custCompanyName.trim() 
        : `${custFirstName} ${custLastName}`.trim(),
      company_name: custCompanyName.trim() || null,
      tax_id: custTaxId.trim() || null,
      phone: custPhone.trim() || null,
      phone_secondary: custPhone2.trim() || null,
      line_id: custLineId.trim() || null,
      email: custEmail.trim() || null,
      notes: custNotes.trim() || null,
    };

    if (!editingCustomer) {
      payload.site_name = initSiteName.trim() || 'สถานที่หลัก (Site 1)';
      payload.address = initSiteAddress.trim() || null;
      payload.latitude = initSiteLat ? parseFloat(initSiteLat) : null;
      payload.longitude = initSiteLng ? parseFloat(initSiteLng) : null;
    }

    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsCustModalOpen(false);
        fetchCustomers();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    if (!confirm(`คุณต้องการลบข้อมูลลูกค้า "${cust.customerName || cust.firstName}" ใช่หรือไม่? (ข้อมูลไซต์งานที่เกี่ยวข้องจะถูกลบด้วย)`)) {
      return;
    }
    try {
      const res = await fetch(`/api/customers/${cust.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomers();
      } else {
        alert('เกิดข้อผิดพลาดในการลบ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Add/Edit Site Modal
  const handleOpenSiteModal = (cust: Customer, site?: CustomerSite) => {
    setActiveCustomerForSite(cust);
    if (site) {
      setEditingSite(site);
      setSiteName(site.siteName || '');
      setSiteIsDefault(Boolean(site.isDefault));
      setSiteAddress(site.address || '');
      setSiteLat(site.latitude ? String(site.latitude) : '');
      setSiteLng(site.longitude ? String(site.longitude) : '');
      setSiteMapUrl(site.mapUrl || '');
      setSiteCoordName(site.coordinatorName || '');
      setSiteCoordPhone(site.coordinatorPhone || '');
      setSiteCoordLine(site.coordinatorLineId || '');
      setSiteNotes(site.siteNotes || '');
    } else {
      setEditingSite(null);
      setSiteName(`ไซต์งาน ${(cust.sites?.length || 0) + 1}`);
      setSiteIsDefault((cust.sites?.length || 0) === 0);
      setSiteAddress('');
      setSiteLat('');
      setSiteLng('');
      setSiteMapUrl('');
      setSiteCoordName(cust.firstName || '');
      setSiteCoordPhone(cust.phone || '');
      setSiteCoordLine(cust.lineId || '');
      setSiteNotes('');
    }
    setIsSiteModalOpen(true);
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomerForSite) return;

    const payload = {
      site_name: siteName.trim(),
      is_default: siteIsDefault,
      address: siteAddress.trim(),
      latitude: siteLat ? parseFloat(siteLat) : null,
      longitude: siteLng ? parseFloat(siteLng) : null,
      map_url: siteMapUrl.trim() || null,
      coordinator_name: siteCoordName.trim() || null,
      coordinator_phone: siteCoordPhone.trim() || null,
      coordinator_line_id: siteCoordLine.trim() || null,
      site_notes: siteNotes.trim() || null,
    };

    try {
      const url = editingSite 
        ? `/api/customers/sites/${editingSite.id}` 
        : `/api/customers/${activeCustomerForSite.id}/sites`;
      const method = editingSite ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsSiteModalOpen(false);
        fetchCustomerSites(activeCustomerForSite.id);
        fetchCustomers();
      } else {
        alert('เกิดข้อผิดพลาดในการบันทึกไซต์งาน');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  const handleDeleteSite = async (customerId: string, siteId: string, siteName: string) => {
    if (!confirm(`คุณต้องการลบไซต์งาน "${siteName}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/customers/sites/${siteId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCustomerSites(customerId);
        fetchCustomers();
      } else {
        alert('เกิดข้อผิดพลาดในการลบ');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered customers
  const filteredCustomers = customers.filter(c => {
    const matchesType = selectedTypeFilter === 'all' || c.customerType === selectedTypeFilter;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchesType;
    const matchesSearch = 
      (c.firstName && c.firstName.toLowerCase().includes(q)) ||
      (c.lastName && c.lastName.toLowerCase().includes(q)) ||
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
      (c.taxId && c.taxId.includes(q));
    return matchesType && matchesSearch;
  });

  return (
    <div className="customer-master-container" style={{ padding: '0.5rem 0' }}>
      {/* HEADER & CONTROLS */}
      <div 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          gap: '1rem',
          marginBottom: '1.25rem' 
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users color="var(--accent-primary, #f59e0b)" size={24} />
            ฐานข้อมูลลูกค้าและไซต์งาน (Customer & Site Directory)
          </h2>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem' }}>
            จัดเก็บ Master ข้อมูลลูกค้าหลัก รองรับลูกค้า 1 ราย มีได้หลายสถานที่ติดตั้ง/ไซต์งาน (1:Many) พร้อมพิกัด GIS
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenCustModal()}
          style={{
            background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
            color: '#0f172a',
            border: 'none',
            borderRadius: '10px',
            padding: '0.65rem 1.25rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
        >
          <Plus size={18} strokeWidth={2.5} />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div
        style={{
          background: 'var(--bg-secondary, #ffffff)',
          border: '1px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, บริษัท, รหัสลูกค้า..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color, #cbd5e1)',
                background: 'var(--bg-primary, #f8fafc)',
                fontSize: '0.85rem',
                outline: 'none',
                color: 'var(--text-primary, #0f172a)'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type Filter Buttons */}
          <div style={{ display: 'flex', background: 'var(--bg-tertiary, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)' }}>
            {(['all', 'individual', 'corporate'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedTypeFilter(type)}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: selectedTypeFilter === type ? 700 : 500,
                  background: selectedTypeFilter === type ? 'var(--bg-secondary, #ffffff)' : 'transparent',
                  color: selectedTypeFilter === type ? 'var(--accent-primary, #b45309)' : 'var(--text-secondary, #64748b)',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  boxShadow: selectedTypeFilter === type ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {type === 'all' ? 'ทั้งหมด' : type === 'individual' ? 'บุคคลธรรมดา' : 'นิติบุคคล/บริษัท'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', fontWeight: 600 }}>
          พบลูกค้าทั้งหมด <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{filteredCustomers.length}</strong> ราย
        </div>
      </div>

      {/* CUSTOMER LIST */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          กำลังโหลดฐานข้อมูลลูกค้า...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div
          style={{
            padding: '3.5rem 1rem',
            textAlign: 'center',
            background: 'var(--bg-secondary, #ffffff)',
            borderRadius: '12px',
            border: '1px dashed var(--border-color, #cbd5e1)'
          }}
        >
          <Users size={40} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
          <h4 style={{ margin: 0, color: 'var(--text-primary, #1e293b)' }}>ไม่พบข้อมูลลูกค้า</h4>
          <p style={{ margin: '0.35rem 0 1rem', color: '#64748b', fontSize: '0.85rem' }}>
            {searchTerm ? 'ลองเปลี่ยนคำค้นหา หรือกรองใหม่' : 'เริ่มต้นสร้างข้อมูลลูกค้าคนแรก'}
          </p>
          <button
            type="button"
            onClick={() => handleOpenCustModal()}
            style={{
              background: '#eab308',
              color: '#0f172a',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1.25rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            + เพิ่มลูกค้าใหม่
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredCustomers.map(cust => {
            const isExpanded = expandedCustomerId === cust.id;
            const sitesCount = (cust as any).sites_count || cust.sites?.length || 0;
            const isCorp = cust.customerType === 'corporate';

            return (
              <div
                key={cust.id}
                style={{
                  background: 'var(--bg-secondary, #ffffff)',
                  border: isExpanded ? '1.5px solid var(--accent-primary, #f59e0b)' : '1px solid var(--border-color, #e2e8f0)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxShadow: isExpanded ? '0 8px 20px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.02)'
                }}
              >
                {/* CUSTOMER SUMMARY ROW */}
                <div
                  style={{
                    padding: '0.9rem 1.25rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--bg-tertiary, #fffbeb)' : 'transparent',
                  }}
                  onClick={() => handleToggleExpand(cust.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: '240px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isCorp ? 'rgba(59, 130, 246, 0.12)' : 'rgba(234, 179, 8, 0.15)',
                        color: isCorp ? '#2563eb' : '#b45309',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isCorp ? <Building2 size={22} /> : <User size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '4px', background: isCorp ? '#dbeafe' : '#fef3c7', color: isCorp ? '#1e40af' : '#92400e' }}>
                          {cust.customerCode || 'CUST'}
                        </span>
                        <strong style={{ fontSize: '0.98rem', color: 'var(--text-primary, #0f172a)' }}>
                          {isCorp && cust.companyName ? cust.companyName : (cust.customerName || `${cust.firstName} ${cust.lastName || ''}`.trim())}
                        </strong>
                        {isCorp && cust.firstName && (
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            (ผู้ติดต่อ: {cust.firstName} {cust.lastName})
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-secondary, #64748b)' }}>
                        {cust.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Phone size={13} color="#059669" /> {cust.phone}
                          </span>
                        )}
                        {cust.lineId && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <strong style={{ color: '#06c755' }}>LINE:</strong> {cust.lineId}
                          </span>
                        )}
                        {cust.taxId && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <FileText size={13} /> เลขผู้เสียภาษี: {cust.taxId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT SIDE BADGES & ACTIONS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '20px',
                        background: sitesCount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: sitesCount > 0 ? '#059669' : '#64748b',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <MapPin size={14} /> {sitesCount} ไซต์งาน/ที่อยู่
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenSiteModal(cust)}
                        title="เพิ่มไซต์งานใหม่ให้ลูกค้าคนนี้"
                        style={{
                          background: 'var(--bg-primary, #f1f5f9)',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          color: '#0f172a',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Plus size={14} /> เพิ่มไซต์
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenCustModal(cust)}
                        title="แก้ไขข้อมูลลูกค้า"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px'
                        }}
                      >
                        <Edit size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(cust)}
                        title="ลบลูกค้า"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.35rem',
                          borderRadius: '6px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ color: '#94a3b8', marginLeft: '0.25rem' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED SECTION: CUSTOMER SITES & HISTORY */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1.25rem',
                      borderTop: '1px solid var(--border-color, #e2e8f0)',
                      background: 'var(--bg-primary, #f8fafc)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary, #0f172a)' }}>
                        <MapPin size={16} color="#ef4444" />
                        รายการสถานที่ติดตั้ง / ไซต์งานของลูกค้ารายนี้ ({cust.sites?.length || 0} แห่ง)
                      </h4>

                      <button
                        type="button"
                        onClick={() => handleOpenSiteModal(cust)}
                        style={{
                          background: '#0f172a',
                          color: '#facc15',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <Plus size={14} /> เพิ่มไซต์งานใหม่
                      </button>
                    </div>

                    {/* SITES CARDS GRID */}
                    {(!cust.sites || cust.sites.length === 0) ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-secondary, #ffffff)', borderRadius: '8px', border: '1px dashed var(--border-color, #cbd5e1)', color: '#64748b', fontSize: '0.85rem' }}>
                        ยังไม่มีการบันทึกไซต์งานหรือสถานที่ติดตั้งของลูกค้ารายนี้
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
                        {cust.sites.map((site, sIdx) => {
                          const hasCoords = Boolean(site.latitude && site.longitude);

                          return (
                            <div
                              key={site.id || sIdx}
                              style={{
                                background: 'var(--bg-secondary, #ffffff)',
                                border: site.isDefault ? '1.5px solid #10b981' : '1px solid var(--border-color, #e2e8f0)',
                                borderRadius: '10px',
                                padding: '0.85rem 1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '0.65rem',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                              }}
                            >
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>{site.siteName}</strong>
                                    {site.isDefault && (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#d1fae5', color: '#065f46', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                        ★ ไซต์หลัก
                                      </span>
                                    )}
                                  </div>

                                  <div style={{ display: 'flex', gap: '0.2rem' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSiteModal(cust, site)}
                                      title="แก้ไขไซต์นี้"
                                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px' }}
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSite(cust.id, site.id, site.siteName)}
                                      title="ลบไซต์นี้"
                                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: 'var(--text-primary, #334155)', lineHeight: 1.4, marginBottom: '0.4rem' }}>
                                  📍 {site.address || 'ไม่ระบุที่อยู่'}
                                </div>

                                {hasCoords && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: '#059669', marginBottom: '0.4rem' }}>
                                    <Navigation size={12} />
                                    <span>พิกัด GIS: {Number(site.latitude).toFixed(6)}, {Number(site.longitude).toFixed(6)}</span>
                                    <a
                                      href={`https://www.google.com/maps?q=${site.latitude},${site.longitude}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '2px', textDecoration: 'none', fontWeight: 600 }}
                                    >
                                      เปิด Maps <ExternalLink size={10} />
                                    </a>
                                  </div>
                                )}

                                {(site.coordinatorName || site.coordinatorPhone) && (
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', background: 'var(--bg-primary, #f8fafc)', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                                    👤 ผู้ประสานงานหน้างาน: <strong>{site.coordinatorName || '-'}</strong> {site.coordinatorPhone ? `(โทร: ${site.coordinatorPhone})` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CUSTOMER */}
      {/* ========================================================================= */}
      {isCustModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-primary, #f8fafc)'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                <Users size={20} color="#eab308" />
                {editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่เข้าสู่ Master'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCustModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Type Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  ประเภทลูกค้า <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="custType"
                      value="individual"
                      checked={custFormType === 'individual'}
                      onChange={() => setCustFormType('individual')}
                    />
                    บุคคลธรรมดา
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="custType"
                      value="corporate"
                      checked={custFormType === 'corporate'}
                      onChange={() => setCustFormType('corporate')}
                    />
                    นิติบุคคล / บริษัท / ร้านค้า
                  </label>
                </div>
              </div>

              {/* Names */}
              {custFormType === 'corporate' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    ชื่อบริษัท / นิติบุคคล <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น บริษัท เอสซีจี จำกัด (มหาชน)..."
                    value={custCompanyName}
                    onChange={(e) => setCustCompanyName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    {custFormType === 'corporate' ? 'ชื่อผู้ติดต่อ' : 'ชื่อจริง'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น สมชาย"
                    value={custFirstName}
                    onChange={(e) => setCustFirstName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    นามสกุล
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ใจดี"
                    value={custLastName}
                    onChange={(e) => setCustLastName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Contacts */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    เบอร์โทรหลัก <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="081-xxx-xxxx"
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    LINE ID
                  </label>
                  <input
                    type="text"
                    placeholder="line-id"
                    value={custLineId}
                    onChange={(e) => setCustLineId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    อีเมล (Email)
                  </label>
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    เลขประจำตัวผู้เสียภาษี (Tax ID)
                  </label>
                  <input
                    type="text"
                    placeholder="13 หลัก (ถ้ามี)"
                    value={custTaxId}
                    onChange={(e) => setCustTaxId(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Initial Site info when creating new customer */}
              {!editingCustomer && (
                <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={16} color="#eab308" /> ข้อมูลไซต์งาน / ที่อยู่ติดตั้งเริ่มต้น (Initial Site)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setGisTarget('init_site');
                        setIsGisModalOpen(true);
                      }}
                      style={{
                        background: '#eab308',
                        color: '#0f172a',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.3rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Map size={13} /> ปักหมุดแผนที่ GIS
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="ชื่อไซต์ เช่น บ้านพักหลัก, สำนักงานใหญ่"
                      value={initSiteName}
                      onChange={(e) => setInitSiteName(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', marginBottom: '0.5rem' }}
                    />
                    <textarea
                      placeholder="ที่อยู่สถานที่ติดตั้ง เช่น เลขที่ 99/9 ถ.สุขุมวิท ต.คลองเตย อ.คลองเตย กรุงเทพฯ..."
                      rows={2}
                      value={initSiteAddress}
                      onChange={(e) => setInitSiteAddress(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', resize: 'vertical' }}
                    />
                  </div>

                  {(initSiteLat || initSiteLng) && (
                    <div style={{ fontSize: '0.75rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Navigation size={12} />
                      <span>พิกัดปักหมุด: {initSiteLat}, {initSiteLng}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  placeholder="เช่น ลูกค้าชอบติดต่อช่วงเย็น, มีสุนัขในบ้าน..."
                  rows={2}
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ background: '#eab308', color: '#0f172a', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  บันทึกข้อมูลลูกค้า
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CUSTOMER SITE */}
      {/* ========================================================================= */}
      {isSiteModalOpen && activeCustomerForSite && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary, #ffffff)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid var(--border-color, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-primary, #f8fafc)'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a' }}>
                  <MapPin size={20} color="#ef4444" />
                  {editingSite ? 'แก้ไขสถานที่ติดตั้ง/ไซต์งาน' : 'เพิ่มไซต์งานใหม่ให้ลูกค้า'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  ลูกค้า: {activeCustomerForSite.customerName || activeCustomerForSite.firstName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSiteModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSite} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  ชื่อไซต์งาน / สถานที่ติดตั้ง <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บ้านพักหลัก, โรงงานบางปะอิน, สาขาเซ็นทรัล..."
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={siteIsDefault}
                    onChange={(e) => setSiteIsDefault(e.target.checked)}
                  />
                  ตั้งเป็นสถานที่ติดตั้งหลัก (Default Site)
                </label>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    ที่อยู่ติดตั้งข้อความ <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setGisTarget('site_form');
                      setIsGisModalOpen(true);
                    }}
                    style={{
                      background: '#eab308',
                      color: '#0f172a',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Map size={13} /> ปักหมุดแผนที่ GIS
                  </button>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="พิมพ์ที่อยู่ เช่น เลขที่ 123/45 ซ.สุขุมวิท 101..."
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {(siteLat || siteLng) && (
                <div style={{ background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #a7f3d0', fontSize: '0.75rem', color: '#065f46', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📍 พิกัด GIS: {siteLat}, {siteLng}</span>
                  <button
                    type="button"
                    onClick={() => { setSiteLat(''); setSiteLng(''); }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    ล้างพิกัด
                  </button>
                </div>
              )}

              {/* Coordinator */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    ผู้ติดต่อ / ดูแลหน้างาน (Coordinator)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น คุณสมชาย (ผู้รับเหมา)"
                    value={siteCoordName}
                    onChange={(e) => setSiteCoordName(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    เบอร์โทรผู้ติดต่อหน้างาน
                  </label>
                  <input
                    type="text"
                    placeholder="081-xxx-xxxx"
                    value={siteCoordPhone}
                    onChange={(e) => setSiteCoordPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  ข้อจำกัด / หมายเหตุหน้างาน
                </label>
                <textarea
                  rows={2}
                  placeholder="เช่น ประตูเปิด 8:00 - 17:00, ทางเข้าแคบรถ 6 ล้อเข้าไม่ได้..."
                  value={siteNotes}
                  onChange={(e) => setSiteNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsSiteModalOpen(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ background: '#0f172a', color: '#facc15', border: 'none', padding: '0.5rem 1.5rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  บันทึกไซต์งาน
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIS MAP PICKER MODAL */}
      {isGisModalOpen && (
        <GisMapPickerModal
          isOpen={isGisModalOpen}
          onClose={() => setIsGisModalOpen(false)}
          initialLat={gisTarget === 'init_site' ? initSiteLat : siteLat}
          initialLng={gisTarget === 'init_site' ? initSiteLng : siteLng}
          initialAddress={gisTarget === 'init_site' ? initSiteAddress : siteAddress}
          onSelectLocation={(lat, lng, address) => {
            if (gisTarget === 'init_site') {
              setInitSiteLat(lat);
              setInitSiteLng(lng);
              if (address && !initSiteAddress) setInitSiteAddress(address);
            } else {
              setSiteLat(lat);
              setSiteLng(lng);
              if (address && !siteAddress) setSiteAddress(address);
              setSiteMapUrl(`https://www.google.com/maps?q=${lat},${lng}`);
            }
          }}
        />
      )}
    </div>
  );
};
