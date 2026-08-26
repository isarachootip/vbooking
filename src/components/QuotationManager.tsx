import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Trash2, Printer, Save, CheckCircle, 
  ArrowUpRight, Eye, RefreshCw, DollarSign, Calendar, User as UserIcon, 
  Building, Phone, MapPin, Tag, ListPlus, X, Check, FileCheck, Layers
} from 'lucide-react';
import type { ServicePriceItem, User } from '../types';

interface QuotationManagerProps {
  currentUser?: User | null;
}

interface QuotationItem {
  id?: string;
  price_book_id?: string | null;
  service_name: string;
  quantity: number;
  unit_type: string;
  unit_cost: number;
  unit_price: number;
  total_price: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  lead_id?: string | null;
  project_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  lead_job_type?: string;
  project_name?: string;
  issue_date: string;
  valid_until?: string | null;
  status: string;
  subtotal: number | string;
  vat_type: string;
  vat_amount: number | string;
  grand_total: number | string;
  total_cost?: number | string;
  notes?: string | null;
  created_at: string;
  created_by?: string;
  items?: QuotationItem[];
}

const DEFAULT_TERMS_PRESETS = [
  'กำหนดยืนราคา 30 วัน นับจากวันที่ออกเอกสารใบเสนอราคา',
  'เงื่อนไขการชำระเงิน: งวดที่ 1 มัดจำ 30% วันทำสัญญา, งวดที่ 2 ระหว่างดำเนินการ 40%, งวดที่ 3 ส่งมอบงาน 30%',
  'ระยะเวลาดำเนินงานติดตั้ง 30 วันทำการ หลังจากได้รับอนุมัติแบบและส่งมอบพื้นที่',
  'รับประกันคุณภาพงานติดตั้งและบริการหลังการขาย 1 ปีเต็ม',
  'ราคานี้รวมค่าขนส่ง วัสดุอุปกรณ์ และค่าแรงติดตั้งเรียบร้อยแล้ว',
  'หากมีงานเพิ่มเติมนอกเหนือจากขอบเขตงานนี้ จะคิดราคาตามราคากลาง Service Price Book'
];

export const QuotationManager: React.FC<QuotationManagerProps> = ({ currentUser }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [priceBook, setPriceBook] = useState<ServicePriceItem[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);

  // Form States
  const [customerSource, setCustomerSource] = useState<'custom' | 'lead' | 'project' | 'customer'>('lead');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [vatType, setVatType] = useState('Exclude VAT');
  const [items, setItems] = useState<QuotationItem[]>([]);
  
  // Bullets State for Terms & Conditions
  const [bullets, setBullets] = useState<string[]>([
    'กำหนดยืนราคา 30 วัน นับจากวันที่ออกเอกสารใบเสนอราคา',
    'เงื่อนไขการชำระเงิน: งวดที่ 1 มัดจำ 30% วันทำสัญญา, งวดที่ 2 ระหว่างดำเนินการ 40%, งวดที่ 3 ส่งมอบงาน 30%',
    'รับประกันคุณภาพงานติดตั้งและบริการหลังการขาย 1 ปีเต็ม'
  ]);
  const [newBulletText, setNewBulletText] = useState('');

  // Custom Item Form
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customUnit, setCustomUnit] = useState('ตร.ม.');
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [customCost, setCustomCost] = useState<number | ''>('');

  // Price Book Search
  const [pbSearch, setPbSearch] = useState('');
  const [pbCategory, setPbCategory] = useState('ALL');

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (Number(item.unit_price || 0) * Number(item.quantity || 0)), 0);
  const totalCost = items.reduce((acc, item) => acc + (Number(item.unit_cost || 0) * Number(item.quantity || 0)), 0);
  
  let vatAmount = 0;
  let grandTotal = subtotal;
  
  if (vatType === 'Exclude VAT') {
    vatAmount = subtotal * 0.07;
    grandTotal = subtotal + vatAmount;
  } else if (vatType === 'Include VAT') {
    vatAmount = subtotal - (subtotal / 1.07);
  }

  const marginPercent = subtotal > 0 ? Math.round(((subtotal - totalCost) / subtotal) * 100) : 0;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [quoRes, pbRes, leadsRes, projRes, custRes] = await Promise.all([
        fetch('/api/quotations'),
        fetch('/api/pricebook'),
        fetch('/api/leads'),
        fetch('/api/projects'),
        fetch('/api/customers')
      ]);

      if (quoRes.ok) {
        const qData = await quoRes.json();
        setQuotations(Array.isArray(qData) ? qData : (qData.data || []));
      }
      if (pbRes.ok) {
        const pbData = await pbRes.json();
        setPriceBook(Array.isArray(pbData) ? pbData : (pbData.data || []));
      }
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setLeads(Array.isArray(lData) ? lData : (lData.data || []));
      }
      if (projRes.ok) {
        const pData = await projRes.json();
        setProjects(Array.isArray(pData) ? pData : (pData.data || []));
      }
      if (custRes && custRes.ok) {
        const cData = await custRes.json();
        setCustomers(Array.isArray(cData) ? cData : (cData.data || []));
      }
    } catch (err) {
      console.error('Error loading quotation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (src: 'lead' | 'project' | 'customer' | 'custom') => {
    setCustomerSource(src);
    if (src === 'custom') {
      setSelectedLeadId('');
      setSelectedProjectId('');
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
    } else if (src === 'lead') {
      setSelectedProjectId('');
      setSelectedCustomerId('');
      if (selectedLeadId) {
        handleLeadSelect(selectedLeadId);
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
      }
    } else if (src === 'project') {
      setSelectedLeadId('');
      setSelectedCustomerId('');
      if (selectedProjectId) {
        handleProjectSelect(selectedProjectId);
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
      }
    } else if (src === 'customer') {
      setSelectedLeadId('');
      setSelectedProjectId('');
      if (selectedCustomerId) {
        handleCustomerSelect(selectedCustomerId);
      } else {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
      }
    }
  };

  const handleLeadSelect = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      return;
    }
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      setCustomerName(lead.customer_name || lead.customerName || '');
      setCustomerPhone(lead.customer_phone || lead.customerPhone || '');
      setCustomerAddress(lead.customer_address || lead.customerAddress || lead.address || '');
    }
  };

  const handleProjectSelect = (projId: string) => {
    setSelectedProjectId(projId);
    if (!projId) {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      return;
    }
    const proj = projects.find(p => p.id === projId);
    if (proj) {
      setCustomerName(proj.customer_name || proj.customerName || proj.name || '');
      setCustomerPhone(proj.customer_phone || proj.customerPhone || '');
      setCustomerAddress(proj.customer_address || proj.customerAddress || proj.address || '');
    }
  };

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (!custId) {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      return;
    }
    const cust = customers.find(c => c.id === custId || c.customerId === custId);
    if (cust) {
      setCustomerName(cust.customer_name || cust.customerName || `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || cust.company_name || '');
      setCustomerPhone(cust.phone || cust.phone_secondary || '');
      setCustomerAddress(cust.default_site_address || cust.defaultSiteAddress || cust.address || '');
    }
  };

  const handleAddPriceBookItem = (pbItem: ServicePriceItem) => {
    const existingIndex = items.findIndex(i => i.price_book_id === pbItem.id);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price;
      setItems(updated);
    } else {
      setItems([...items, {
        price_book_id: pbItem.id,
        service_name: pbItem.service_name,
        quantity: 1,
        unit_type: pbItem.unit_type || 'งาน',
        unit_cost: (pbItem.material_cost || 0) + (pbItem.labor_cost || 0),
        unit_price: pbItem.selling_price || 0,
        total_price: pbItem.selling_price || 0
      }]);
    }
  };

  const handleAddCustomItem = () => {
    if (!customName.trim() || !customPrice || Number(customPrice) <= 0) {
      alert('กรุณากรอกชื่อรายการและราคาขายให้ถูกต้อง');
      return;
    }
    const price = Number(customPrice);
    const cost = Number(customCost || 0);
    const qty = Number(customQty || 1);

    setItems([...items, {
      service_name: customName.trim(),
      quantity: qty,
      unit_type: customUnit || 'งาน',
      unit_cost: cost,
      unit_price: price,
      total_price: price * qty
    }]);

    setCustomName('');
    setCustomQty(1);
    setCustomPrice('');
    setCustomCost('');
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, val: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = Number(newItems[index].quantity || 0) * Number(newItems[index].unit_price || 0);
    }
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Bullet Management
  const handleAddBullet = () => {
    if (!newBulletText.trim()) return;
    setBullets([...bullets, newBulletText.trim()]);
    setNewBulletText('');
  };

  const handleRemoveBullet = (index: number) => {
    setBullets(bullets.filter((_, i) => i !== index));
  };

  const handleAddPresetBullet = (preset: string) => {
    if (!bullets.includes(preset)) {
      setBullets([...bullets, preset]);
    }
  };

  const handleSaveQuotation = async () => {
    if (items.length === 0) {
      alert('กรุณาเพิ่มรายการสินค้า/บริการอย่างน้อย 1 รายการ');
      return;
    }

    try {
      const formattedNotes = bullets.length > 0 
        ? bullets.map(b => (b.startsWith('•') ? b : `• ${b}`)).join('\n')
        : '';

      const payload = {
        lead_id: customerSource === 'lead' ? (selectedLeadId || null) : null,
        project_id: customerSource === 'project' ? (selectedProjectId || null) : null,
        customer_id: customerSource === 'customer' ? (selectedCustomerId || null) : null,
        customer_name: customerName.trim() || 'ลูกค้าทั่วไป',
        customer_phone: customerPhone.trim(),
        customer_address: customerAddress.trim(),
        issue_date: issueDate,
        valid_until: validUntil,
        vat_type: vatType,
        items: items,
        notes: formattedNotes,
        created_by: currentUser?.name || 'Admin'
      };

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        resetForm();
        fetchAllData();
        alert('สร้างใบเสนอราคาสำเร็จ!');
      } else {
        const errData = await res.json();
        alert(errData.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const resetForm = () => {
    setSelectedLeadId('');
    setSelectedProjectId('');
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setItems([]);
    setBullets([
      'กำหนดยืนราคา 30 วัน นับจากวันที่ออกเอกสารใบเสนอราคา',
      'เงื่อนไขการชำระเงิน: งวดที่ 1 มัดจำ 30% วันทำสัญญา, งวดที่ 2 ระหว่างดำเนินการ 40%, งวดที่ 3 ส่งมอบงาน 30%',
      'รับประกันคุณภาพงานติดตั้งและบริการหลังการขาย 1 ปีเต็ม'
    ]);
    setNewBulletText('');
    setVatType('Exclude VAT');
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('ยืนยันอนุมัติใบเสนอราคานี้หรือไม่?')) return;
    try {
      const res = await fetch(`/api/quotations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Approved' })
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('คุณแน่ใจว่าต้องการลบใบเสนอราคานี้หรือไม่?')) return;
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async (id: string) => {
    if (!window.confirm('ระบบจะสร้างโครงการใหม่และสร้าง Tasks จากรายการใบเสนอราคา ยืนยันดำเนินการหรือไม่?')) return;
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`สำเร็จ! สร้างโปรเจกต์ใหม่เรียบร้อยแล้ว รหัสโครงการ: ${data.project_id}`);
        fetchAllData();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการแปลงใบเสนอราคา');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenPreview = async (quo: Quotation) => {
    try {
      const res = await fetch(`/api/quotations/${quo.id}`);
      if (res.ok) {
        const fullQuo = await res.json();
        setPreviewQuotation(fullQuo);
      } else {
        setPreviewQuotation(quo);
      }
    } catch {
      setPreviewQuotation(quo);
    }
  };

  // Filtered Quotations
  const filteredQuotations = quotations.filter(q => {
    const matchesSearch = 
      (q.quotation_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.customer_phone || '').includes(searchTerm);

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && q.status === statusFilter;
  });

  // Price Book categories
  const categories = ['ALL', ...Array.from(new Set(priceBook.map(pb => pb.category).filter(Boolean)))];
  const filteredPriceBook = priceBook.filter(pb => {
    const matchesCat = pbCategory === 'ALL' || pb.category === pbCategory;
    const matchesSearch = (pb.service_name || '').toLowerCase().includes(pbSearch.toLowerCase()) ||
                          (pb.category || '').toLowerCase().includes(pbSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Stats
  const totalCount = quotations.length;
  const totalSum = quotations.reduce((acc, q) => acc + Number(q.grand_total || 0), 0);
  const pendingCount = quotations.filter(q => q.status === 'Draft' || q.status === 'Pending').length;
  const approvedCount = quotations.filter(q => q.status === 'Approved').length;
  const convertedCount = quotations.filter(q => q.status === 'Converted').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header & Action Button */}
      <div className="flex-between" style={{ marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-primary) 0%, #6366f1 100%)', color: 'white', padding: '0.6rem', borderRadius: '10px', display: 'flex' }}>
              <FileText size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                ระบบออกใบเสนอราคา (Quotation & BOQ)
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
                ออกใบเสนอราคามาตรฐาน ดึงราคากลาง Price Book จัดการข้อกำหนดแบบ Bullet Points และแปลงเป็นโครงการทันที
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={fetchAllData}
            className="glass-panel hover-lift"
            style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent' }}
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>รีเฟรช</span>
          </button>

          <button 
            onClick={() => {
              resetForm();
              fetchAllData();
              setIsModalOpen(true);
            }}
            style={{ 
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #6366f1 100%)', 
              color: 'white', 
              padding: '0.65rem 1.35rem', 
              borderRadius: '8px', 
              border: 'none', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              fontWeight: 700, 
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
            }}
            className="hover-lift"
          >
            <Plus size={18} /> สร้างใบเสนอราคาใหม่
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6', padding: '0.75rem', borderRadius: '10px' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ใบเสนอราคาทั้งหมด</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>ฉบับ</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', padding: '0.75rem', borderRadius: '10px' }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>มูลค่ารวมทั้งสิ้น</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>฿{totalSum.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', padding: '0.75rem', borderRadius: '10px' }}>
            <FileCheck size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รอดำเนินการ / ร่าง</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>{pendingCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>ฉบับ</span></div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.1rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', padding: '0.75rem', borderRadius: '10px' }}>
            <ArrowUpRight size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>แปลงเป็นโครงการแล้ว</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#8b5cf6' }}>{convertedCount} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>โครงการ</span></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'Draft', 'Pending', 'Approved', 'Converted'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: statusFilter === st ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                color: statusFilter === st ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s'
              }}
            >
              {st === 'ALL' ? 'ทั้งหมด' : st === 'Draft' ? 'ร่างบิล (Draft)' : st === 'Pending' ? 'รอลูกค้า (Pending)' : st === 'Approved' ? 'อนุมัติแล้ว (Approved)' : 'แปลงเป็นโปรเจกต์ (Converted)'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="ค้นหาเลขที่บิล, ชื่อลูกค้า, เบอร์โทร..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.5rem 0.75rem 0.5rem 2.25rem', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)', 
              background: 'var(--bg-secondary)', 
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Quotations List Table */}
      <div className="glass-panel" style={{ padding: '0', overflowX: 'auto', borderRadius: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)' }}>
              <th style={{ padding: '1rem', fontWeight: 700 }}>เลขที่บิล</th>
              <th style={{ padding: '1rem', fontWeight: 700 }}>ลูกค้า / โครงการ</th>
              <th style={{ padding: '1rem', fontWeight: 700 }}>วันที่ออกเอกสาร</th>
              <th style={{ padding: '1rem', fontWeight: 700 }}>ยอดรวมสุทธิ (Grand Total)</th>
              <th style={{ padding: '1rem', fontWeight: 700 }}>ภาษี (VAT)</th>
              <th style={{ padding: '1rem', fontWeight: 700 }}>สถานะ</th>
              <th style={{ padding: '1rem', fontWeight: 700, textAlign: 'center' }}>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotations.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <FileText size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
                  <div>ไม่พบข้อมูลใบเสนอราคา</div>
                  <button 
                    onClick={() => { resetForm(); fetchAllData(); setIsModalOpen(true); }}
                    style={{ marginTop: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    + สร้างใบแรกเลย
                  </button>
                </td>
              </tr>
            ) : (
              filteredQuotations.map(quo => (
                <tr key={quo.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} className="table-row-hover">
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    {quo.quotation_number}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{quo.customer_name || 'ลูกค้าทั่วไป'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.15rem' }}>
                      {quo.customer_phone && <span>📞 {quo.customer_phone}</span>}
                      {quo.lead_job_type && <span style={{ background: 'var(--bg-secondary)', padding: '0 0.3rem', borderRadius: '3px' }}>🏷️ {quo.lead_job_type}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    <div>{quo.issue_date}</div>
                    {quo.valid_until && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ยืนราคาถึง: {quo.valid_until}</div>}
                  </td>
                  <td style={{ padding: '1rem', color: '#10b981', fontWeight: 800, fontSize: '1rem' }}>
                    ฿{Number(quo.grand_total || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    <span style={{ fontSize: '0.75rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {quo.vat_type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '12px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700,
                      background: quo.status === 'Converted' ? 'rgba(139, 92, 246, 0.12)' : quo.status === 'Approved' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                      color: quo.status === 'Converted' ? '#8b5cf6' : quo.status === 'Approved' ? '#10b981' : '#f59e0b'
                    }}>
                      {quo.status === 'Draft' ? 'ร่างบิล' : quo.status === 'Pending' ? 'รอลูกค้า' : quo.status === 'Approved' ? 'อนุมัติแล้ว' : quo.status === 'Converted' ? 'แปลงเป็นโปรเจกต์' : quo.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', alignItems: 'center' }}>
                      <button 
                        onClick={() => handleOpenPreview(quo)}
                        className="hover-lift"
                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600 }}
                        title="ดูตัวอย่าง / พิมพ์เอกสาร"
                      >
                        <Printer size={14} /> พิมพ์
                      </button>

                      {quo.status !== 'Approved' && quo.status !== 'Converted' && (
                        <button 
                          onClick={() => handleApprove(quo.id)}
                          style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          title="ลูกค้ายืนยันอนุมัติ"
                        >
                          <CheckCircle size={14} /> อนุมัติ
                        </button>
                      )}

                      {quo.status !== 'Converted' && (
                        <button 
                          onClick={() => handleConvert(quo.id)}
                          style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          title="สร้างโปรเจกต์และ Tasks งานทันที"
                        >
                          <ArrowUpRight size={14} /> แปลงโปรเจกต์
                        </button>
                      )}

                      {quo.status === 'Draft' && (
                        <button 
                          onClick={() => handleDelete(quo.id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.35rem' }}
                          title="ลบใบเสนอราคา"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE QUOTATION MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.5rem' }}>
          <div className="glass-panel" style={{ width: '1100px', maxWidth: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.4rem', borderRadius: '6px' }}>
                  <FileText size={18} />
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>ออกใบเสนอราคาใหม่ (Quotation & BOQ Builder)</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 700 }}>✕</button>
            </div>

            {/* Modal Body Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', flex: 1, overflow: 'hidden' }}>
              
              {/* Left Side: Builder Form & Table & Bullets */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. Customer Selector */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UserIcon size={14} color="var(--accent-primary)" /> ข้อมูลลูกค้าและโครงการ
                    </label>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <button 
                        type="button" 
                        onClick={() => handleSourceChange('lead')} 
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: customerSource === 'lead' ? 'var(--accent-primary)' : 'transparent', color: customerSource === 'lead' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        จาก Leads
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleSourceChange('project')} 
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: customerSource === 'project' ? 'var(--accent-primary)' : 'transparent', color: customerSource === 'project' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        จาก Projects
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleSourceChange('customer')} 
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: customerSource === 'customer' ? 'var(--accent-primary)' : 'transparent', color: customerSource === 'customer' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        จาก ฐานข้อมูลกลาง
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleSourceChange('custom')} 
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: customerSource === 'custom' ? 'var(--accent-primary)' : 'transparent', color: customerSource === 'custom' ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
                      >
                        กรอกเอง
                      </button>
                    </div>
                  </div>

                  {customerSource === 'lead' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <select 
                        value={selectedLeadId} 
                        onChange={e => handleLeadSelect(e.target.value)} 
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      >
                        <option value="">-- เลือกลูกค้ามุ่งหวัง (Lead) --</option>
                        {leads.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.id}: {l.customer_name || l.customerName || 'ลูกค้า'} ({l.job_type || l.jobType || 'ทั่วไป'}) {l.customer_phone || l.customerPhone ? `- ${l.customer_phone || l.customerPhone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {customerSource === 'project' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <select 
                        value={selectedProjectId} 
                        onChange={e => handleProjectSelect(e.target.value)} 
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      >
                        <option value="">-- เลือกโครงการ (Project) --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.id}: {p.name} {p.customer_name || p.customerName ? `(${p.customer_name || p.customerName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {customerSource === 'customer' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <select 
                        value={selectedCustomerId} 
                        onChange={e => handleCustomerSelect(e.target.value)} 
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      >
                        <option value="">-- เลือกลูกค้าจากฐานข้อมูลกลาง (Master Customers) --</option>
                        {customers.map(c => {
                          const cId = c.id || c.customerId;
                          const code = c.customer_code || c.customerCode || cId;
                          const name = c.customer_name || c.customerName || `${c.first_name || ''} ${c.last_name || ''}`.trim() || c.company_name || 'ลูกค้า';
                          const phone = c.phone || c.phone_secondary || '';
                          const addr = c.default_site_address || c.defaultSiteAddress || c.address || '';
                          return (
                            <option key={cId} value={cId}>
                              {code}: {name} {phone ? `- ${phone}` : ''} {addr ? `(${addr.length > 35 ? addr.slice(0, 35) + '...' : addr})` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ชื่อลูกค้า / นามนิติบุคคล</label>
                      <input 
                        type="text" 
                        placeholder="เช่น คุณสมชาย เจริญสุข"
                        value={customerName} 
                        onChange={e => setCustomerName(e.target.value)} 
                        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>เบอร์โทรศัพท์ติดต่อ</label>
                      <input 
                        type="text" 
                        placeholder="081-xxx-xxxx"
                        value={customerPhone} 
                        onChange={e => setCustomerPhone(e.target.value)} 
                        style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>ที่อยู่สถานที่ติดตั้ง / ออกใบเสนอราคา</label>
                    <input 
                      type="text" 
                      placeholder="เช่น 123/45 ซ.สุขุมวิท 101 แขวงบางจาก เขตพระโขนง กทม."
                      value={customerAddress} 
                      onChange={e => setCustomerAddress(e.target.value)} 
                      style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* 2. Dates & VAT */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>วันที่ออกเอกสาร</label>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>กำหนดยืนราคาถึง</label>
                    <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>รูปแบบภาษี (VAT)</label>
                    <select value={vatType} onChange={e => setVatType(e.target.value)} style={{ width: '100%', padding: '0.45rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                      <option value="Exclude VAT">ราคาแยกภาษี (Exclude VAT +7%)</option>
                      <option value="Include VAT">ราคารวมภาษีแล้ว (Include VAT 7%)</option>
                      <option value="No VAT">ไม่คิดภาษี (No VAT)</option>
                    </select>
                  </div>
                </div>

                {/* 3. Items Table */}
                <div>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Layers size={15} color="var(--accent-primary)" /> รายการสินค้า / บริการที่เสนอราคา ({items.length})
                    </label>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.5rem 0.6rem' }}>รายการ</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', width: '70px' }}>จำนวน</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', width: '70px' }}>หน่วย</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', width: '100px' }}>ราคา/หน่วย</th>
                          <th style={{ padding: '0.5rem', textAlign: 'right', width: '110px' }}>ราคารวม</th>
                          <th style={{ padding: '0.5rem', textAlign: 'center', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                              ยังไม่มีรายการ กรุณาเลือกจาก Price Book ด้านขวา หรือพิมพ์เพิ่มรายการเองด้านล่าง
                            </td>
                          </tr>
                        ) : (
                          items.map((it, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.5rem 0.6rem' }}>
                                <input 
                                  type="text" 
                                  value={it.service_name} 
                                  onChange={e => handleUpdateItem(idx, 'service_name', e.target.value)} 
                                  style={{ width: '100%', padding: '0.2rem 0.4rem', background: 'transparent', border: '1px solid transparent', color: 'var(--text-primary)', fontWeight: 600 }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={it.quantity} 
                                  onChange={e => handleUpdateItem(idx, 'quantity', Number(e.target.value))} 
                                  style={{ width: '50px', textAlign: 'center', padding: '0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <input 
                                  type="text" 
                                  value={it.unit_type} 
                                  onChange={e => handleUpdateItem(idx, 'unit_type', e.target.value)} 
                                  style={{ width: '50px', textAlign: 'center', padding: '0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-secondary)' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                <input 
                                  type="number" 
                                  value={it.unit_price} 
                                  onChange={e => handleUpdateItem(idx, 'unit_price', Number(e.target.value))} 
                                  style={{ width: '85px', textAlign: 'right', padding: '0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)' }}
                                />
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                                ฿{Number(it.total_price || 0).toLocaleString()}
                              </td>
                              <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveItem(idx)}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add Custom Item Inline */}
                  <div style={{ marginTop: '0.6rem', display: 'grid', gridTemplateColumns: '2fr 80px 80px 100px 100px auto', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      placeholder="+ รายการบริการ/สินค้ากำหนดเอง"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                    />
                    <input 
                      type="number" 
                      placeholder="จำนวน"
                      min="1"
                      value={customQty}
                      onChange={e => setCustomQty(Number(e.target.value))}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem', textAlign: 'center' }}
                    />
                    <input 
                      type="text" 
                      placeholder="หน่วย"
                      value={customUnit}
                      onChange={e => setCustomUnit(e.target.value)}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem', textAlign: 'center' }}
                    />
                    <input 
                      type="number" 
                      placeholder="ราคาขาย"
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem', textAlign: 'right' }}
                    />
                    <input 
                      type="number" 
                      placeholder="ต้นทุน (ถ้ามี)"
                      value={customCost}
                      onChange={e => setCustomCost(e.target.value === '' ? '' : Number(e.target.value))}
                      style={{ padding: '0.35rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem', textAlign: 'right' }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddCustomItem}
                      style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + เพิ่ม
                    </button>
                  </div>
                </div>

                {/* 4. Bullets for Terms & Conditions (ขอขึ้น bullet ใหม่) */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ListPlus size={16} color="var(--accent-primary)" /> ข้อกำหนด & เงื่อนไขในใบเสนอราคา (Bullet Points)
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>แสดงในเอกสารทางการ</span>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center' }}>+ เพิ่ม Template:</span>
                    {DEFAULT_TERMS_PRESETS.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleAddPresetBullet(preset)}
                        style={{
                          fontSize: '0.7rem',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {preset.length > 25 ? preset.slice(0, 25) + '...' : preset}
                      </button>
                    ))}
                  </div>

                  {/* Bullet Items List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {bullets.map((b, bIdx) => (
                      <div key={bIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>•</span>
                        <input 
                          type="text" 
                          value={b} 
                          onChange={e => {
                            const updated = [...bullets];
                            updated[bIdx] = e.target.value;
                            setBullets(updated);
                          }}
                          style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemoveBullet(bIdx)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add New Bullet Input */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      placeholder="พิมพ์เงื่อนไขข้อใหม่แล้วกดปุ่ม + เพิ่ม Bullet..."
                      value={newBulletText}
                      onChange={e => setNewBulletText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddBullet(); } }}
                      style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                    />
                    <button 
                      type="button" 
                      onClick={handleAddBullet}
                      style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '5px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + เพิ่ม Bullet
                    </button>
                  </div>
                </div>

                {/* 5. Totals Box */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', width: '280px', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>รวมเป็นเงิน (Subtotal):</span>
                    <span>฿{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', width: '280px', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <span>ภาษีมูลค่าเพิ่ม 7% ({vatType}):</span>
                    <span>฿{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', width: '280px', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                    <span>ยอดรวมทั้งสิ้น:</span>
                    <span style={{ color: '#10b981' }}>฿{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {totalCost > 0 && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      ต้นทุนรวม: ฿{totalCost.toLocaleString()} | กำไรเบื้องต้น: <strong style={{ color: marginPercent > 20 ? '#10b981' : '#f59e0b' }}>{marginPercent}%</strong>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Side: Price Book Sidebar */}
              <div style={{ padding: '1.25rem', background: 'var(--bg-tertiary)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>ฐานข้อมูลราคากลาง (Price Book)</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>คลิกเพื่อเพิ่มรายการเข้าใบเสนอราคา</p>
                </div>

                {/* Category Dropdown */}
                <select 
                  value={pbCategory} 
                  onChange={e => setPbCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c === 'ALL' ? 'ทุกหมวดหมู่งาน' : c}</option>
                  ))}
                </select>

                {/* Search Price Book */}
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อบริการ/หมวดหมู่งาน..."
                  value={pbSearch}
                  onChange={e => setPbSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '5px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.78rem' }}
                />

                {/* Price Book Items List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                  {filteredPriceBook.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem', fontSize: '0.75rem' }}>
                      ไม่พบรายการใน Price Book
                    </div>
                  ) : (
                    filteredPriceBook.map(pb => (
                      <div key={pb.id} style={{ background: 'var(--bg-primary)', padding: '0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pb.service_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{pb.category}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem' }}>
                          <span style={{ color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>
                            ฿{Number(pb.selling_price || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ {pb.unit_type || 'งาน'}</span>
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleAddPriceBookItem(pb)}
                            style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700 }}
                          >
                            + เพิ่ม
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--bg-secondary)' }}>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                style={{ padding: '0.5rem 1.25rem', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                ยกเลิก
              </button>
              <button 
                type="button" 
                onClick={handleSaveQuotation} 
                disabled={items.length === 0} 
                style={{ 
                  padding: '0.5rem 1.5rem', 
                  borderRadius: '6px', 
                  background: items.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--bg-tertiary)', 
                  color: items.length > 0 ? 'white' : 'var(--text-muted)', 
                  border: 'none', 
                  cursor: items.length > 0 ? 'pointer' : 'not-allowed', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '0.85rem'
                }}
              >
                <Save size={16} /> บันทึกใบเสนอราคา
              </button>
            </div>

          </div>
        </div>
      )}

      {/* OFFICIAL PRINT PREVIEW MODAL */}
      {previewQuotation && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ width: '850px', maxWidth: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#1e293b', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            
            {/* Top Bar for Controls */}
            <div style={{ background: '#0f172a', color: 'white', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Printer size={16} /> ตัวอย่างเอกสารใบเสนอราคา (Official Print Preview)
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => window.print()} 
                  style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.35rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Printer size={14} /> พิมพ์ / PDF
                </button>
                <button 
                  onClick={() => setPreviewQuotation(null)} 
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Printable A4 Body */}
            <div id="quotation-print-area" style={{ padding: '2.5rem', overflowY: 'auto', flex: 1, fontFamily: "'Sarabun', 'Noto Sans Thai', sans-serif" }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    PMT DESIGN & RENOVATION
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.2rem' }}>
                    บริษัท พีเอ็มที บิลด์โฟลว์ แมเนจเม้นท์ จำกัด (สำนักงานใหญ่)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    เลขประจำตัวผู้เสียภาษี: 0105567012345 | โทร: 02-123-4567, 081-999-8888
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    อีเมล: contact@pmt-buildflow.com | www.pmt-buildflow.com
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb' }}>
                    ใบเสนอราคา
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>
                    QUOTATION / BOQ
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                    <div><strong>เลขที่:</strong> {previewQuotation.quotation_number}</div>
                    <div><strong>วันที่:</strong> {previewQuotation.issue_date}</div>
                    {previewQuotation.valid_until && <div><strong>ยืนราคาถึง:</strong> {previewQuotation.valid_until}</div>}
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>ลูกค้า (Customer Details):</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{previewQuotation.customer_name || 'ลูกค้าทั่วไป'}</div>
                  {previewQuotation.customer_phone && <div>โทร: {previewQuotation.customer_phone}</div>}
                  {previewQuotation.customer_address && <div style={{ color: '#64748b', marginTop: '0.2rem' }}>สถานที่: {previewQuotation.customer_address}</div>}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.25rem' }}>ข้อมูลโครงการ (Project Details):</div>
                  <div><strong>ประเภทงาน:</strong> {previewQuotation.lead_job_type || 'งานปรับปรุง / รีโนเวท'}</div>
                  {previewQuotation.project_name && <div><strong>โครงการ:</strong> {previewQuotation.project_name}</div>}
                  <div><strong>ผู้เสนอราคา:</strong> {previewQuotation.created_by || 'PMT Engineering Team'}</div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: 'white' }}>
                    <th style={{ padding: '0.5rem', textAlign: 'center', width: '40px' }}>ลำดับ</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>รายละเอียดรายการ (Description)</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', width: '60px' }}>จำนวน</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', width: '60px' }}>หน่วย</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '100px' }}>ราคา/หน่วย</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right', width: '120px' }}>จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {(!previewQuotation.items || previewQuotation.items.length === 0) ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '1rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>ไม่มีรายการ</td>
                    </tr>
                  ) : (
                    previewQuotation.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{idx + 1}</td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>{it.service_name}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{it.quantity}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#64748b' }}>{it.unit_type || 'งาน'}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>{Number(it.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontWeight: 700, borderRight: '1px solid #e2e8f0' }}>{Number(it.total_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Totals & Notes Section */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* Terms Bullets */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.4rem' }}>ข้อกำหนดและเงื่อนไข (Terms & Conditions):</div>
                  {previewQuotation.notes ? (
                    <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6', color: '#334155' }}>
                      {previewQuotation.notes}
                    </div>
                  ) : (
                    <div style={{ color: '#94a3b8' }}>- ตามข้อตกลงมาตรฐานของบริษัท -</div>
                  )}
                </div>

                {/* Grand Total Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#475569' }}>
                    <span>รวมเป็นเงิน (Subtotal):</span>
                    <span>฿{Number(previewQuotation.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#475569' }}>
                    <span>ภาษีมูลค่าเพิ่ม 7% ({previewQuotation.vat_type}):</span>
                    <span>฿{Number(previewQuotation.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.5rem', background: '#0f172a', color: 'white', borderRadius: '4px', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.25rem' }}>
                    <span>จำนวนเงินรวมทั้งสิ้น:</span>
                    <span style={{ color: '#4ade80' }}>฿{Number(previewQuotation.grand_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '3rem', paddingTop: '1rem', fontSize: '0.8rem', textAlign: 'center' }}>
                <div>
                  <div style={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 0.5rem' }}></div>
                  <div style={{ fontWeight: 700 }}>({previewQuotation.created_by || 'ผู้มีอำนาจลงนาม'})</div>
                  <div style={{ color: '#64748b' }}>ผู้เสนอราคา / Authorized Signature</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.2rem' }}>วันที่: ____/____/________</div>
                </div>

                <div>
                  <div style={{ borderBottom: '1px solid #94a3b8', width: '80%', margin: '0 auto 0.5rem' }}></div>
                  <div style={{ fontWeight: 700 }}>({previewQuotation.customer_name || 'ลูกค้าผู้สั่งจ้าง'})</div>
                  <div style={{ color: '#64748b' }}>ผู้อนุมัติสั่งจ้าง / Customer Acceptance</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '0.2rem' }}>วันที่: ____/____/________</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
