import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Plus, Search, Trash2, Edit3, CheckCircle, 
  ArrowUpRight, Eye, RefreshCw, DollarSign, Calendar, User as UserIcon, 
  Building, Phone, MapPin, Tag, ListPlus, X, Check, FileCheck, Layers, 
  Sparkles, TrendingUp, Award, Zap, ChevronRight, Calculator, CheckSquare, 
  AlertCircle, ShieldCheck, HardHat, Hammer, Wrench, Users, ArrowRight
} from 'lucide-react';
import { CustomDateInput } from './CustomDateInput';
import { formatToDDMMYYYY } from '../utils';
import type { User, ServicePriceItem } from '../types';

interface Contractor {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  line_id?: string;
  skills?: string[];
  rating?: number;
  completed_jobs?: number;
  status?: string;
  notes?: string;
}

interface DraftEstimationItem {
  id?: string;
  area_name: string;
  trade_category: string;
  item_name: string;
  specs_description?: string;
  quantity: number;
  unit: string;
  price_book_id?: string | null;
  selected_contractor_id?: string | null;
  selected_contractor_name?: string | null;
  selected_material_unit_cost?: number;
  selected_labor_unit_cost?: number;
  selected_unit_cost?: number;
  selected_total_cost?: number;
  customer_unit_price?: number;
  customer_total_price?: number;
  sort_order?: number;
}

interface ContractorBidItem {
  id?: string;
  draft_item_id: string;
  material_unit_price: number;
  labor_unit_price: number;
  total_unit_price: number;
  total_amount: number;
  remark?: string;
  is_selected?: boolean;
}

interface ContractorBid {
  id: string;
  draft_estimation_id: string;
  contractor_id?: string | null;
  contractor_name: string;
  bid_date?: string;
  total_bid_amount: number;
  estimated_days?: number;
  status?: string;
  notes?: string;
  contractor_phone?: string;
  contractor_skills?: string[];
  contractor_rating?: number;
  items?: ContractorBidItem[];
}

interface DraftEstimation {
  id: string;
  estimation_number: string;
  title: string;
  lead_id?: string | null;
  project_id?: string | null;
  customer_id?: string | null;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  project_type?: string;
  status: string;
  target_margin_percent: number;
  selected_total_cost: number;
  proposed_subtotal: number;
  vat_type: string;
  proposed_vat_amount: number;
  proposed_grand_total: number;
  notes?: string;
  lead_customer_name?: string;
  converted_quotation_id?: string | null;
  converted_quotation_number?: string | null;
  created_at: string;
  created_by?: string;
  item_count?: number;
  bid_count?: number;
  items?: DraftEstimationItem[];
  bids?: ContractorBid[];
}

interface DraftEstimationManagerProps {
  currentUser?: User | null;
}

const COMMON_AREAS = [
  'ห้องนั่งเล่น / โถงรับแขก', 'ห้องนอนใหญ่ (Master Bedroom)', 'ห้องนอน 2', 'ห้องครัว (Kitchen)', 
  'ห้องน้ำ 1', 'ห้องน้ำ 2', 'ระเบียง / ซักล้าง', 'ภายนอกอาคาร / โรงรถ', 'ทั้งหลัง (เหมาทั้งพื้นที่)'
];

const COMMON_TRADES = [
  'งานไฟฟ้า & สื่อสาร', 'งานฝ้าเพดาน & ผนังเบา', 'งานแอร์ & ระบายอากาศ', 
  'งานประปา & สุขาภิบาล', 'งานทาสี', 'งานปูกระเบื้อง & พื้น', 'งานบิวท์อิน & ตกแต่ง', 'งานรื้อถอน & โครงสร้าง'
];

export const DraftEstimationManager: React.FC<DraftEstimationManagerProps> = ({ currentUser }) => {
  const [estimations, setEstimations] = useState<DraftEstimation[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [priceBook, setPriceBook] = useState<ServicePriceItem[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active View / Modals
  const [activeEstimation, setActiveEstimation] = useState<DraftEstimation | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isContractorsModalOpen, setIsContractorsModalOpen] = useState(false);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<ContractorBid | null>(null);

  // Create/Edit Draft Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formProjectType, setFormProjectType] = useState('Renovate');
  const [formTargetMargin, setFormTargetMargin] = useState<number>(35);
  const [formVatType, setFormVatType] = useState('Exclude VAT');
  const [formNotes, setFormNotes] = useState('');
  const [formLeadId, setFormLeadId] = useState('');
  const [formItems, setFormItems] = useState<DraftEstimationItem[]>([
    {
      area_name: 'ห้องนั่งเล่น / โถงรับแขก',
      trade_category: 'งานไฟฟ้า & สื่อสาร',
      item_name: 'เดินสายไฟร้อยท่อฝังผนังพร้อมติดตั้งเต้ารับ-สวิตช์',
      specs_description: 'ท่อ UPVC สีขาว, สาย THW 2.5 sq.mm., ปลั๊กคู่มีกราวด์ Panasonic',
      quantity: 10,
      unit: 'จุด',
      selected_material_unit_cost: 200,
      selected_labor_unit_cost: 150
    },
    {
      area_name: 'ห้องนั่งเล่น / โถงรับแขก',
      trade_category: 'งานฝ้าเพดาน & ผนังเบา',
      item_name: 'รื้อฝ้าเดิมและติดตั้งฝ้าฉาบเรียบโครงคร่าว C-Line',
      specs_description: 'แผ่นยิปซัม 9 มม. ขอบลาด โครงตราช้าง สปริงปรับระดับ',
      quantity: 25,
      unit: 'ตร.ม.',
      selected_material_unit_cost: 180,
      selected_labor_unit_cost: 200
    }
  ]);

  // Bid Entry State
  const [bidContractorId, setBidContractorId] = useState('');
  const [bidContractorName, setBidContractorName] = useState('');
  const [bidEstimatedDays, setBidEstimatedDays] = useState<number>(10);
  const [bidNotes, setBidNotes] = useState('');
  const [bidItemsPrices, setBidItemsPrices] = useState<Record<string, { mat: number; lab: number; remark: string }>>({});

  // Contractor Form State
  const [newContName, setNewContName] = useState('');
  const [newContContact, setNewContContact] = useState('');
  const [newContPhone, setNewContPhone] = useState('');
  const [newContLine, setNewContLine] = useState('');
  const [newContSkills, setNewContSkills] = useState('');
  const [newContRating, setNewContRating] = useState<number>(5.0);

  // Fetch all estimations and contractors
  const fetchData = async () => {
    setLoading(true);
    try {
      const [estRes, contRes, pbRes, leadsRes] = await Promise.all([
        fetch('/api/estimations'),
        fetch('/api/estimations/contractors'),
        fetch('/api/pricebook'),
        fetch('/api/leads')
      ]);

      if (estRes.ok) setEstimations(await estRes.json());
      if (contRes.ok) setContractors(await contRes.json());
      if (pbRes.ok) setPriceBook(await pbRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch full details of an active estimation
  const openEstimationDetail = async (estId: string) => {
    try {
      const res = await fetch(`/api/estimations/${estId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveEstimation(data);
      }
    } catch (err) {
      console.error('Failed to fetch estimation details:', err);
    }
  };

  // Add Item to Form
  const handleAddItem = () => {
    setFormItems(prev => [
      ...prev,
      {
        area_name: prev[prev.length - 1]?.area_name || 'ห้องนั่งเล่น / โถงรับแขก',
        trade_category: prev[prev.length - 1]?.trade_category || 'งานทั่วไป',
        item_name: '',
        specs_description: '',
        quantity: 1,
        unit: 'รายการ',
        selected_material_unit_cost: 0,
        selected_labor_unit_cost: 0
      }
    ]);
  };

  // Remove Item from Form
  const handleRemoveItem = (index: number) => {
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  // Pick Price Book Item into form
  const handlePickPriceBook = (index: number, pbId: string) => {
    const pb = priceBook.find(p => p.id === pbId);
    if (!pb) return;
    setFormItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        price_book_id: pb.id,
        item_name: pb.service_name,
        trade_category: pb.category || next[index].trade_category,
        unit: pb.unit_type || 'หน่วย',
        selected_material_unit_cost: Number(pb.material_cost || 0),
        selected_labor_unit_cost: Number(pb.labor_cost || 0)
      };
      return next;
    });
  };

  // Save new Draft Estimation
  const handleSaveEstimation = async () => {
    if (!formTitle.trim()) {
      alert('กรุณาระบุชื่องานประมาณการ');
      return;
    }
    if (formItems.length === 0) {
      alert('กรุณาเพิ่มรายการงานอย่างน้อย 1 รายการ');
      return;
    }

    try {
      const body = {
        title: formTitle,
        customer_name: formCustomerName,
        customer_phone: formCustomerPhone,
        customer_address: formCustomerAddress,
        project_type: formProjectType,
        lead_id: formLeadId || null,
        target_margin_percent: formTargetMargin,
        vat_type: formVatType,
        notes: formNotes,
        items: formItems,
        created_by: currentUser?.name || 'Admin'
      };

      const res = await fetch('/api/estimations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const saved = await res.json();
        setIsCreateModalOpen(false);
        await fetchData();
        openEstimationDetail(saved.id);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save estimation');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // Open Bid Modal for a Contractor
  const handleOpenBidModal = (bidToEdit?: ContractorBid) => {
    if (!activeEstimation) return;
    if (bidToEdit) {
      setEditingBid(bidToEdit);
      setBidContractorId(bidToEdit.contractor_id || '');
      setBidContractorName(bidToEdit.contractor_name);
      setBidEstimatedDays(bidToEdit.estimated_days || 10);
      setBidNotes(bidToEdit.notes || '');

      const initialPrices: Record<string, { mat: number; lab: number; remark: string }> = {};
      (bidToEdit.items || []).forEach(it => {
        initialPrices[it.draft_item_id] = {
          mat: it.material_unit_price || 0,
          lab: it.labor_unit_price || 0,
          remark: it.remark || ''
        };
      });
      setBidItemsPrices(initialPrices);
    } else {
      setEditingBid(null);
      setBidContractorId(contractors[0]?.id || '');
      setBidContractorName(contractors[0]?.name || '');
      setBidEstimatedDays(10);
      setBidNotes('');
      // Pre-fill with default draft estimation item costs
      const initialPrices: Record<string, { mat: number; lab: number; remark: string }> = {};
      (activeEstimation.items || []).forEach(it => {
        if (it.id) {
          initialPrices[it.id] = {
            mat: Number(it.selected_material_unit_cost || 0),
            lab: Number(it.selected_labor_unit_cost || 0),
            remark: ''
          };
        }
      });
      setBidItemsPrices(initialPrices);
    }
    setIsBidModalOpen(true);
  };

  // Save Contractor Bid
  const handleSaveBid = async () => {
    if (!activeEstimation) return;
    if (!bidContractorName.trim()) {
      alert('กรุณาเลือกหรือระบุชื่อทีมช่าง');
      return;
    }

    const itemsPayload = (activeEstimation.items || []).map(it => {
      const price = bidItemsPrices[it.id || ''] || { mat: 0, lab: 0, remark: '' };
      return {
        draft_item_id: it.id,
        material_unit_price: Number(price.mat) || 0,
        labor_unit_price: Number(price.lab) || 0,
        quantity: it.quantity,
        remark: price.remark
      };
    });

    try {
      const body = {
        bid_id: editingBid?.id || null,
        contractor_id: bidContractorId || null,
        contractor_name: bidContractorName,
        estimated_days: bidEstimatedDays,
        notes: bidNotes,
        items: itemsPayload
      };

      const res = await fetch(`/api/estimations/${activeEstimation.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setIsBidModalOpen(false);
        await openEstimationDetail(activeEstimation.id);
        await fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save bid');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกราคาช่าง');
    }
  };

  // Delete Contractor Bid
  const handleDeleteBid = async (bidId: string) => {
    if (!activeEstimation || !confirm('ต้องการลบข้อมูลราคาของทีมช่างนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`/api/estimations/${activeEstimation.id}/bids/${bidId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await openEstimationDetail(activeEstimation.id);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Apply Selection & Margin
  const handleApplySelection = async (selections: any[], targetMargin?: number) => {
    if (!activeEstimation) return;
    try {
      const margin = targetMargin !== undefined ? targetMargin : activeEstimation.target_margin_percent;
      const res = await fetch(`/api/estimations/${activeEstimation.id}/apply-selection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_margin_percent: margin,
          selections
        })
      });

      if (res.ok) {
        await openEstimationDetail(activeEstimation.id);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Auto-Pick Best Lowest Prices
  const handleAutoPickBestPrices = () => {
    if (!activeEstimation || !activeEstimation.items || !activeEstimation.bids || activeEstimation.bids.length === 0) {
      alert('ยังไม่มีข้อมูลการเสนอราคาจากทีมช่างเพื่อเปรียบเทียบ');
      return;
    }

    const selections = activeEstimation.items.map(it => {
      let lowestTotalUnit = Infinity;
      let bestBid: ContractorBid | null = null;
      let bestBidItem: ContractorBidItem | null = null;

      activeEstimation.bids?.forEach(bid => {
        const bItem = bid.items?.find(bi => bi.draft_item_id === it.id);
        if (bItem) {
          const totalUnit = Number(bItem.total_unit_price || (Number(bItem.material_unit_price || 0) + Number(bItem.labor_unit_price || 0)));
          if (totalUnit < lowestTotalUnit && totalUnit > 0) {
            lowestTotalUnit = totalUnit;
            bestBid = bid;
            bestBidItem = bItem;
          }
        }
      });

      if (bestBid && bestBidItem) {
        const b = bestBid as ContractorBid;
        const bi = bestBidItem as ContractorBidItem;
        return {
          draft_item_id: it.id,
          contractor_id: b.contractor_id || null,
          contractor_name: b.contractor_name,
          material_unit_cost: bi.material_unit_price,
          labor_unit_cost: bi.labor_unit_price,
          unit_cost: bi.total_unit_price
        };
      } else {
        return {
          draft_item_id: it.id,
          contractor_id: it.selected_contractor_id,
          contractor_name: it.selected_contractor_name,
          material_unit_cost: it.selected_material_unit_cost,
          labor_unit_cost: it.selected_labor_unit_cost,
          unit_cost: it.selected_unit_cost
        };
      }
    });

    handleApplySelection(selections);
  };

  // Select a whole contractor for all items
  const handleSelectEntireContractor = (bid: ContractorBid) => {
    if (!activeEstimation || !activeEstimation.items) return;
    const selections = activeEstimation.items.map(it => {
      const bItem = bid.items?.find(bi => bi.draft_item_id === it.id);
      return {
        draft_item_id: it.id,
        contractor_id: bid.contractor_id || null,
        contractor_name: bid.contractor_name,
        material_unit_cost: bItem?.material_unit_price || 0,
        labor_unit_cost: bItem?.labor_unit_price || 0,
        unit_cost: bItem?.total_unit_price || 0
      };
    });
    handleApplySelection(selections);
  };

  // 1-Click Convert to Quotation
  const handleConvertToQuotation = async () => {
    if (!activeEstimation) return;
    if (activeEstimation.status === 'Converted') {
      alert('เอกสารนี้ถูกแปลงเป็นใบเสนอราคาแล้ว');
      return;
    }

    if (!confirm(`ยืนยันการแปลง Draft ${activeEstimation.estimation_number} เป็นใบเสนอราคาและ BOQ ลูกค้า?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/estimations/${activeEstimation.id}/convert-to-quotation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ created_by: currentUser?.name || 'Admin' })
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ สำเร็จ! ${data.message}\nยอดใบเสนอราคา ฿${Number(data.grand_total || 0).toLocaleString()}`);
        window.location.href = '/quotations';
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to convert to quotation');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการแปลงเป็นใบเสนอราคา');
    }
  };

  // Create Contractor
  const handleCreateContractor = async () => {
    if (!newContName.trim()) {
      alert('กรุณากรอกชื่อทีมช่าง');
      return;
    }
    try {
      const res = await fetch('/api/estimations/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newContName,
          contact_person: newContContact,
          phone: newContPhone,
          line_id: newContLine,
          skills: newContSkills ? newContSkills.split(',').map(s => s.trim()) : [],
          rating: newContRating
        })
      });
      if (res.ok) {
        setNewContName('');
        setNewContContact('');
        setNewContPhone('');
        setNewContLine('');
        setNewContSkills('');
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered estimations
  const filteredEstimations = estimations.filter(e => {
    const matchesSearch = (
      e.estimation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.customer_name && e.customer_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ background: 'rgba(0, 206, 209, 0.15)', color: 'var(--accent-primary)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
              PRE-QUOTATION & BOQ ENGINE
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Phase 02 Pre-Sales Workflow</span>
          </div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <FileSpreadsheet color="var(--accent-primary)" size={28} />
            Draft ประมาณการต้นทุน & เปรียบเทียบราคาช่าง
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.2rem' }}>
            ถอดแบบ กำหนดขอบเขตงาน นำเข้าการเสนอราคาจากช่างหลายทีม (Side-by-Side Matrix) คำนวณ Margin และสร้าง BOQ/ใบเสนอราคาในคลิกเดียว
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsContractorsModalOpen(true)}
            className="glass-panel hover-lift"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.1rem', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.12)', background: 'var(--bg-secondary)',
              color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'
            }}
          >
            <HardHat size={17} color="#f59e0b" />
            ทะเบียนช่าง ({contractors.length})
          </button>

          <button
            onClick={() => {
              setFormTitle('');
              setFormCustomerName('');
              setFormCustomerPhone('');
              setFormCustomerAddress('');
              setFormLeadId('');
              setIsCreateModalOpen(true);
            }}
            className="hover-lift"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)',
              border: 'none', background: 'linear-gradient(135deg, var(--accent-primary), #0080ff)',
              color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem',
              boxShadow: '0 4px 14px rgba(0, 206, 209, 0.35)'
            }}
          >
            <Plus size={18} />
            สร้าง Draft ประมาณการใหม่
          </button>
        </div>
      </div>

      {/* Main Content: Either Detail/Matrix View or List View */}
      {activeEstimation ? (
        /* ========================================================================= */
        /* DETAIL & SIDE-BY-SIDE MATRIX VIEW                                          */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Header Bar */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(0, 206, 209, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <button
                  onClick={() => setActiveEstimation(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  ← กลับหน้ารายการ Draft ทั้งหมด
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeEstimation.title}</span>
                  <span style={{ background: 'rgba(0, 206, 209, 0.12)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.15rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                    {activeEstimation.estimation_number}
                  </span>
                  <span style={{
                    padding: '0.15rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700,
                    background: activeEstimation.status === 'Converted' ? 'rgba(16, 185, 129, 0.2)' : activeEstimation.status === 'Comparing' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: activeEstimation.status === 'Converted' ? '#10b981' : activeEstimation.status === 'Comparing' ? '#60a5fa' : '#f59e0b'
                  }}>
                    ● {activeEstimation.status}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem', flexWrap: 'wrap' }}>
                  <span>👤 ลูกค้า: <strong style={{ color: 'var(--text-primary)' }}>{activeEstimation.customer_name || 'ไม่ระบุ'}</strong></span>
                  <span>📞 เบอร์โทร: {activeEstimation.customer_phone || '-'}</span>
                  <span>🏷️ ประเภท: {activeEstimation.project_type || 'Renovate'}</span>
                  <span>📅 วันที่สร้าง: {formatToDDMMYYYY(activeEstimation.created_at)}</span>
                </div>
              </div>

              {/* Action Buttons on Detail Header */}
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleOpenBidModal()}
                  className="hover-lift"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1rem', borderRadius: 'var(--radius-md)',
                    background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.35)',
                    color: '#60a5fa', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  <Plus size={16} />
                  + เพิ่มราคาเสนอของช่าง (RFQ)
                </button>

                <button
                  onClick={handleAutoPickBestPrices}
                  className="hover-lift"
                  title="ระบบจะเลือกช่างที่เสนอราคาต่ำสุดในแต่ละรายการให้อัตโนมัติ"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.35))',
                    border: '1px solid #10b981', color: '#34d399', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem'
                  }}
                >
                  <Zap size={16} color="#34d399" />
                  ⚡ Auto-Pick Best Prices
                </button>

                {activeEstimation.status !== 'Converted' ? (
                  <button
                    onClick={handleConvertToQuotation}
                    className="hover-lift"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)',
                      border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white', fontWeight: 800, cursor: 'pointer', fontSize: '0.88rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)'
                    }}
                  >
                    <FileCheck size={18} />
                    🚀 แปลงเป็นใบเสนอราคา & BOQ
                  </button>
                ) : (
                  <a
                    href="/quotations"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)',
                      border: '1px solid #10b981', background: 'rgba(16, 185, 129, 0.15)',
                      color: '#10b981', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem'
                    }}
                  >
                    <CheckCircle size={16} /> ดูใบเสนอราคา ({activeEstimation.converted_quotation_number})
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* SIDE-BY-SIDE CONTRACTOR MATRIX TABLE */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Layers size={18} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  ตารางเปรียบเทียบราคาเสนอจากช่าง (Multi-Contractor Comparison Matrix)
                </span>
                <span style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem' }}>
                  {activeEstimation.items?.length || 0} รายการ • {activeEstimation.bids?.length || 0} ทีมช่าง
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                🟢 ไฮไลต์สีเขียว = ราคาต่อหน่วยที่ต่ำที่สุดในรายการนั้น
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '40px', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '0.75rem 1rem', minWidth: '220px' }}>พื้นที่ & รายการขอบเขตงาน</th>
                    <th style={{ padding: '0.75rem 0.5rem', width: '90px', textAlign: 'right' }}>จำนวน</th>
                    <th style={{ padding: '0.75rem 0.5rem', width: '70px', textAlign: 'center' }}>หน่วย</th>

                    {/* Columns for Each Contractor Bid */}
                    {(activeEstimation.bids || []).map((bid, bIdx) => (
                      <th key={bid.id} style={{ padding: '0.75rem 1rem', minWidth: '180px', borderLeft: '1px solid rgba(255,255,255,0.08)', background: `rgba(59, 130, 246, ${0.04 + (bIdx % 2) * 0.03})` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <HardHat size={14} />
                              {bid.contractor_name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              ระยะเวลา: {bid.estimated_days || '-'} วัน
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button
                              onClick={() => handleOpenBidModal(bid)}
                              title="แก้ไขราคาช่างนี้"
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteBid(bid.id)}
                              title="ลบราคาช่างนี้"
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div style={{ marginTop: '0.4rem' }}>
                          <button
                            onClick={() => handleSelectEntireContractor(bid)}
                            style={{
                              width: '100%', padding: '0.2rem 0.4rem', borderRadius: '4px',
                              background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)',
                              color: '#93c5fd', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            เหมาเจ้านี้ทั้งหมด
                          </button>
                        </div>
                      </th>
                    ))}

                    {/* Selected Winner Column */}
                    <th style={{ padding: '0.75rem 1rem', minWidth: '220px', borderLeft: '2px solid var(--accent-primary)', background: 'rgba(0, 206, 209, 0.06)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>🏆 ช่างที่เลือก & ราคาต้นทุน</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Selected Cost Base</div>
                    </th>

                    {/* Customer Unit Price & Subtotal */}
                    <th style={{ padding: '0.75rem 1rem', minWidth: '150px', borderLeft: '1px solid rgba(255,255,255,0.08)', background: 'rgba(16, 185, 129, 0.05)', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#34d399' }}>ราคาขายลูกค้า (BOQ)</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Margin +{activeEstimation.target_margin_percent}%</div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(activeEstimation.items || []).map((it, idx) => {
                    // Find lowest price for this item across all bids
                    let lowestUnitCost = Infinity;
                    activeEstimation.bids?.forEach(bid => {
                      const bi = bid.items?.find(b => b.draft_item_id === it.id);
                      if (bi) {
                        const totalUnit = Number(bi.total_unit_price || (Number(bi.material_unit_price || 0) + Number(bi.labor_unit_price || 0)));
                        if (totalUnit > 0 && totalUnit < lowestUnitCost) {
                          lowestUnitCost = totalUnit;
                        }
                      }
                    });

                    return (
                      <tr key={it.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.15rem' }}>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px', color: 'var(--text-secondary)' }}>
                              {it.area_name}
                            </span>
                            <span style={{ fontSize: '0.7rem', background: 'rgba(0,206,209,0.1)', color: 'var(--accent-primary)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {it.trade_category}
                            </span>
                          </div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{it.item_name}</div>
                          {it.specs_description && (
                            <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                              {it.specs_description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>{it.quantity}</td>
                        <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{it.unit}</td>

                        {/* Bid Prices for each contractor */}
                        {(activeEstimation.bids || []).map(bid => {
                          const bi = bid.items?.find(b => b.draft_item_id === it.id);
                          const mat = bi ? Number(bi.material_unit_price || 0) : 0;
                          const lab = bi ? Number(bi.labor_unit_price || 0) : 0;
                          const totalUnit = bi ? Number(bi.total_unit_price || (mat + lab)) : 0;
                          const isLowest = totalUnit > 0 && totalUnit === lowestUnitCost;
                          const isCurrentlySelected = it.selected_contractor_name === bid.contractor_name;

                          return (
                            <td
                              key={bid.id}
                              style={{
                                padding: '0.75rem 1rem', borderLeft: '1px solid rgba(255,255,255,0.06)',
                                background: isCurrentlySelected ? 'rgba(0, 206, 209, 0.08)' : isLowest ? 'rgba(16, 185, 129, 0.06)' : 'transparent'
                              }}
                            >
                              {totalUnit > 0 ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isLowest ? '#34d399' : 'var(--text-primary)' }}>
                                      ฿{totalUnit.toLocaleString()}
                                    </span>
                                    {isLowest && (
                                      <span style={{ fontSize: '0.65rem', background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '0.05rem 0.3rem', borderRadius: '4px', fontWeight: 700 }}>
                                        Best 🟢
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                    ของ: {mat} • แรง: {lab}
                                  </div>
                                  <div style={{ marginTop: '0.3rem' }}>
                                    <button
                                      onClick={() => {
                                        const currentSelections = (activeEstimation.items || []).map(item => {
                                          if (item.id === it.id) {
                                            return {
                                              draft_item_id: item.id,
                                              contractor_id: bid.contractor_id,
                                              contractor_name: bid.contractor_name,
                                              material_unit_cost: mat,
                                              labor_unit_cost: lab,
                                              unit_cost: totalUnit
                                            };
                                          }
                                          return {
                                            draft_item_id: item.id,
                                            contractor_id: item.selected_contractor_id,
                                            contractor_name: item.selected_contractor_name,
                                            material_unit_cost: item.selected_material_unit_cost,
                                            labor_unit_cost: item.selected_labor_unit_cost,
                                            unit_cost: item.selected_unit_cost
                                          };
                                        });
                                        handleApplySelection(currentSelections);
                                      }}
                                      style={{
                                        padding: '0.15rem 0.4rem', borderRadius: '4px',
                                        background: isCurrentlySelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.06)',
                                        border: isCurrentlySelected ? 'none' : '1px solid rgba(255,255,255,0.12)',
                                        color: isCurrentlySelected ? 'black' : 'var(--text-secondary)',
                                        fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                                      }}
                                    >
                                      {isCurrentlySelected ? '✓ เลือกเจ้านี้' : 'เลือก'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>- ไม่ได้เสนอ -</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Selected Winner Cost Column */}
                        <td style={{ padding: '0.75rem 1rem', borderLeft: '2px solid var(--accent-primary)', background: 'rgba(0, 206, 209, 0.03)' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {it.selected_contractor_name ? (
                              <span style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Award size={13} /> {it.selected_contractor_name}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>ยังไม่เลือกช่าง</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>
                            หน่วยละ: ฿{Number(it.selected_unit_cost || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            รวมทุน: ฿{Number(it.selected_total_cost || 0).toLocaleString()}
                          </div>
                        </td>

                        {/* Customer Unit Price & Subtotal */}
                        <td style={{ padding: '0.75rem 1rem', borderLeft: '1px solid rgba(255,255,255,0.08)', textAlign: 'right', background: 'rgba(16, 185, 129, 0.03)' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#34d399' }}>
                            ฿{Number(it.customer_total_price || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            @฿{Number(it.customer_unit_price || 0).toLocaleString()} / {it.unit}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* Footer Totals Row */}
                <tfoot>
                  <tr style={{ background: 'rgba(0,0,0,0.5)', borderTop: '2px solid rgba(255,255,255,0.15)', fontWeight: 800 }}>
                    <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                      รวมต้นทุนสะสม (Total Bids Comparison):
                    </td>

                    {/* Contractor Bid Sums */}
                    {(activeEstimation.bids || []).map(bid => (
                      <td key={bid.id} style={{ padding: '1rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
                        <div style={{ fontSize: '1rem', color: '#60a5fa', fontWeight: 800 }}>
                          ฿{Number(bid.total_bid_amount || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          เฉลี่ยทั้งโครงการ
                        </div>
                      </td>
                    ))}

                    {/* Selected Total Cost */}
                    <td style={{ padding: '1rem', borderLeft: '2px solid var(--accent-primary)', background: 'rgba(0, 206, 209, 0.1)' }}>
                      <div style={{ fontSize: '1.05rem', color: 'var(--accent-primary)', fontWeight: 900 }}>
                        ฿{Number(activeEstimation.selected_total_cost || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ต้นทุนรวมที่เลือกจริง (Selected Cost)
                      </div>
                    </td>

                    {/* Customer Grand Total */}
                    <td style={{ padding: '1rem', borderLeft: '1px solid rgba(255,255,255,0.08)', textAlign: 'right', background: 'rgba(16, 185, 129, 0.1)' }}>
                      <div style={{ fontSize: '1.15rem', color: '#34d399', fontWeight: 900 }}>
                        ฿{Number(activeEstimation.proposed_grand_total || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ราคาขายรวม ({activeEstimation.vat_type})
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* MARGIN TUNING & PROFIT CALCULATOR PANEL */}
          <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Calculator size={18} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    ปรับอัตรากำไรเป้าหมาย (Company Target Margin %)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={activeEstimation.target_margin_percent}
                    onChange={e => {
                      const newMargin = Number(e.target.value);
                      const selections = (activeEstimation.items || []).map(it => ({
                        draft_item_id: it.id,
                        contractor_id: it.selected_contractor_id,
                        contractor_name: it.selected_contractor_name,
                        material_unit_cost: it.selected_material_unit_cost,
                        labor_unit_cost: it.selected_labor_unit_cost,
                        unit_cost: it.selected_unit_cost
                      }));
                      handleApplySelection(selections, newMargin);
                    }}
                    style={{ flex: 1, accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', minWidth: '55px' }}>
                    {activeEstimation.target_margin_percent}%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  สูตร: ราคาขาย = ต้นทุน ÷ (1 - Margin%)
                </div>
              </div>

              {/* Stats Breakdown Card */}
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ต้นทุนรวม (Cost)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ฿{Number(activeEstimation.selected_total_cost || 0).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#34d399' }}>กำไรขั้นต้น (Gross Profit)</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                    ฿{Math.max(0, Number(activeEstimation.proposed_subtotal || 0) - Number(activeEstimation.selected_total_cost || 0)).toLocaleString()}
                  </div>
                </div>

                <div style={{ background: 'rgba(0, 206, 209, 0.08)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 206, 209, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>ราคาสุทธิเสนอขายลูกค้า (Grand Total)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--accent-primary)' }}>
                    ฿{Number(activeEstimation.proposed_grand_total || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ESTIMATION LIST VIEW                                                      */
        /* ========================================================================= */
        <div>
          {/* Filters Bar */}
          <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: '1 1 300px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={17} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="ค้นหาเลขที่ Draft, ชื่องาน, ชื่อลูกค้า..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                    background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
              {['ALL', 'Draft', 'Comparing', 'Finalized', 'Converted'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-sm)', border: 'none',
                    background: statusFilter === st ? 'var(--accent-primary)' : 'transparent',
                    color: statusFilter === st ? 'black' : 'var(--text-secondary)',
                    fontWeight: statusFilter === st ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer'
                  }}
                >
                  {st === 'ALL' ? 'ทั้งหมด' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Estimations Cards Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>กำลังโหลดข้อมูล Draft ประมาณการ...</div>
          ) : filteredEstimations.length === 0 ? (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)' }}>
              <FileSpreadsheet size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>ไม่พบรายการ Draft ประมาณการ</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>เริ่มต้นสร้าง Draft เพื่อถอดแบบและส่งเทียบราคาช่างหลายทีมก่อนทำใบเสนอราคา</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                style={{
                  padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', border: 'none',
                  background: 'var(--accent-primary)', color: 'black', fontWeight: 700, cursor: 'pointer'
                }}
              >
                + สร้าง Draft แรกเลย
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
              {filteredEstimations.map(est => (
                <div
                  key={est.id}
                  className="glass-panel hover-lift"
                  style={{
                    padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)',
                    border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(0,206,209,0.12)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {est.estimation_number}
                      </span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '4px',
                        background: est.status === 'Converted' ? 'rgba(16, 185, 129, 0.2)' : est.status === 'Comparing' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: est.status === 'Converted' ? '#10b981' : est.status === 'Comparing' ? '#60a5fa' : '#f59e0b'
                      }}>
                        {est.status}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: '1.3' }}>
                      {est.title}
                    </h3>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.85rem' }}>
                      <div>👤 ลูกค้า: <strong style={{ color: 'var(--text-primary)' }}>{est.customer_name || 'ไม่ระบุ'}</strong> {est.customer_phone ? `(${est.customer_phone})` : ''}</div>
                      {est.lead_customer_name && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔗 ลิงก์ Lead: {est.lead_customer_name}</div>}
                    </div>

                    {/* Stats pills */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                      <span style={{ background: 'rgba(255,255,255,0.04)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        📋 {est.item_count || 0} รายการงาน
                      </span>
                      <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.73rem', fontWeight: 600 }}>
                        👷‍♂️ {est.bid_count || 0} ช่างเทียบราคา
                      </span>
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.73rem', fontWeight: 600 }}>
                        📈 Margin {est.target_margin_percent || 30}%
                      </span>
                    </div>
                  </div>

                  {/* Pricing footer and Action Button */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ราคาขายลูกค้า (BOQ)</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                        ฿{Number(est.proposed_grand_total || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ต้นทุนรวม ฿{Number(est.selected_total_cost || 0).toLocaleString()}
                      </div>
                    </div>

                    <button
                      onClick={() => openEstimationDetail(est.id)}
                      className="hover-lift"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(0, 206, 209, 0.15)', border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem'
                      }}
                    >
                      เปิดเทียบราคา <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW DRAFT ESTIMATION                                        */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', maxWidth: '840px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(0, 206, 209, 0.3)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FileSpreadsheet color="var(--accent-primary)" size={22} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>สร้าง Draft ประมาณการต้นทุนใหม่</h2>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>ชื่องานประมาณการ *</label>
                <input
                  type="text"
                  placeholder="เช่น งานรีโนเวทห้องชุด 45 ตร.ม. คอนโด The Line"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>ชื่อลูกค้า</label>
                <input
                  type="text"
                  placeholder="คุณสมชาย"
                  value={formCustomerName}
                  onChange={e => setFormCustomerName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  placeholder="081-234-5678"
                  value={formCustomerPhone}
                  onChange={e => setFormCustomerPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>ประเภทโครงการ</label>
                <select
                  value={formProjectType}
                  onChange={e => setFormProjectType(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                >
                  <option value="Renovate">🏡 Renovate Service</option>
                  <option value="MA Service">🔧 MA Service</option>
                  <option value="Quick Service">⚡ Quick Service</option>
                  <option value="Built-in">🛋️ Built-in Design</option>
                  <option value="New House">🏗️ New House Build</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Target Margin (%)</label>
                <input
                  type="number"
                  min="5"
                  max="70"
                  value={formTargetMargin}
                  onChange={e => setFormTargetMargin(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Scope Items List in Form */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  รายการขอบเขตงาน (Scope of Work Items)
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 206, 209, 0.15)', border: '1px solid var(--accent-primary)',
                    color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> + เพิ่มรายการ
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {formItems.map((it, idx) => (
                  <div key={idx} style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <select
                        value={it.area_name}
                        onChange={e => {
                          const val = e.target.value;
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, area_name: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                      >
                        {COMMON_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>

                      <select
                        value={it.trade_category}
                        onChange={e => {
                          const val = e.target.value;
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, trade_category: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                      >
                        {COMMON_TRADES.map(tr => <option key={tr} value={tr}>{tr}</option>)}
                      </select>

                      {/* Pick from Price Book dropdown */}
                      <select
                        onChange={e => handlePickPriceBook(idx, e.target.value)}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid rgba(0,206,209,0.3)', color: 'var(--accent-primary)', fontSize: '0.75rem' }}
                      >
                        <option value="">⚡ ดึงจาก Price Book...</option>
                        {priceBook.map(pb => (
                          <option key={pb.id} value={pb.id}>{pb.service_name} ({pb.category})</option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.3rem' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.6fr 0.6fr 0.8fr 0.8fr', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="ชื่อรายการงาน (Item Name)"
                        value={it.item_name}
                        onChange={e => {
                          const val = e.target.value;
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, item_name: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                      />
                      <input
                        type="number"
                        placeholder="จำนวน"
                        value={it.quantity}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'right' }}
                      />
                      <input
                        type="text"
                        placeholder="หน่วย"
                        value={it.unit}
                        onChange={e => {
                          const val = e.target.value;
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, unit: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'center' }}
                      />
                      <input
                        type="number"
                        placeholder="ทุนค่าของ"
                        value={it.selected_material_unit_cost || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, selected_material_unit_cost: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'right' }}
                      />
                      <input
                        type="number"
                        placeholder="ทุนค่าแรง"
                        value={it.selected_labor_unit_cost || ''}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, selected_labor_unit_cost: val } : item));
                        }}
                        style={{ padding: '0.4rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ padding: '0.6rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEstimation}
                style={{ padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', border: 'none', color: 'black', fontWeight: 800, cursor: 'pointer' }}
              >
                ✓ บันทึก Draft ประมาณการ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONTRACTOR BID ENTRY (RFQ)                                         */}
      {/* ========================================================================= */}
      {isBidModalOpen && activeEstimation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <HardHat color="#60a5fa" size={22} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {editingBid ? 'แก้ไขราคาเสนอของทีมช่าง' : 'กรอกราคาเสนอของทีมช่าง (Contractor Bid)'}
                </h2>
              </div>
              <button onClick={() => setIsBidModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>เลือกทีมช่างจากทะเบียน หรือระบุชื่อ</label>
                <select
                  value={bidContractorId}
                  onChange={e => {
                    const id = e.target.value;
                    setBidContractorId(id);
                    const found = contractors.find(c => c.id === id);
                    if (found) setBidContractorName(found.name);
                  }}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  <option value="">-- เลือกจากทะเบียนช่าง --</option>
                  {contractors.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.skills?.join(', ') || 'ช่างทั่วไป'}) ⭐{c.rating}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="หรือพิมพ์ชื่อช่างใหม่..."
                  value={bidContractorName}
                  onChange={e => setBidContractorName(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>ระยะเวลาดำเนินงานที่ช่างประเมิน (วัน)</label>
                <input
                  type="number"
                  min="1"
                  value={bidEstimatedDays}
                  onChange={e => setBidEstimatedDays(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>

            {/* Scope Items pricing list */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                ระบุราคาค่าวัสดุและค่าแรงต่อหน่วย (Unit Price) สำหรับแต่ละรายการ:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(activeEstimation.items || []).map((it, idx) => {
                  const currentPrice = bidItemsPrices[it.id || ''] || { mat: 0, lab: 0, remark: '' };
                  const totalUnit = (Number(currentPrice.mat) || 0) + (Number(currentPrice.lab) || 0);
                  const totalAmount = totalUnit * it.quantity;

                  return (
                    <div key={it.id || idx} style={{ background: 'var(--bg-tertiary)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.6rem', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)' }}>[{it.area_name} - {it.trade_category}]</div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.83rem' }}>{it.item_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>จำนวน: {it.quantity} {it.unit}</div>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>ค่าของ/หน่วย (฿)</label>
                        <input
                          type="number"
                          value={currentPrice.mat || ''}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setBidItemsPrices(prev => ({
                              ...prev,
                              [it.id || '']: { ...prev[it.id || ''], mat: val, lab: prev[it.id || '']?.lab || 0, remark: prev[it.id || '']?.remark || '' }
                            }));
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'right' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>ค่าแรง/หน่วย (฿)</label>
                        <input
                          type="number"
                          value={currentPrice.lab || ''}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setBidItemsPrices(prev => ({
                              ...prev,
                              [it.id || '']: { ...prev[it.id || ''], lab: val, mat: prev[it.id || '']?.mat || 0, remark: prev[it.id || '']?.remark || '' }
                            }));
                          }}
                          style={{ width: '100%', padding: '0.35rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'right' }}
                        />
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>รวมรายการนี้</div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#60a5fa' }}>
                          ฿{totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bid Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setIsBidModalOpen(false)}
                style={{ padding: '0.55rem 1.2rem', borderRadius: 'var(--radius-md)', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveBid}
                style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-md)', background: '#3b82f6', border: 'none', color: 'white', fontWeight: 800, cursor: 'pointer' }}
              >
                ✓ บันทึกราคาเสนอช่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONTRACTORS MASTER MANAGEMENT                                      */}
      {/* ========================================================================= */}
      {isContractorsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <HardHat color="#f59e0b" size={22} />
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>ทะเบียนช่าง & ผู้รับเหมา (Contractors Master)</h2>
              </div>
              <button onClick={() => setIsContractorsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            {/* Add new contractor form */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                + เพิ่มช่างใหม่เข้าทะเบียน
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="ชื่อทีมช่าง / หจก.*"
                  value={newContName}
                  onChange={e => setNewContName(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="ผู้ติดต่อ"
                  value={newContContact}
                  onChange={e => setNewContContact(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={newContPhone}
                  onChange={e => setNewContPhone(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
                <input
                  type="text"
                  placeholder="LINE ID"
                  value={newContLine}
                  onChange={e => setNewContLine(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr auto', gap: '0.5rem' }}>
                <input
                  type="text"
                  placeholder="ทักษะ/หมวดงาน (คั่นด้วยจุลภาค เช่น งานไฟ, งานฝ้า, สี)"
                  value={newContSkills}
                  onChange={e => setNewContSkills(e.target.value)}
                  style={{ padding: '0.45rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="5"
                  placeholder="Rating"
                  value={newContRating}
                  onChange={e => setNewContRating(Number(e.target.value))}
                  style={{ padding: '0.45rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                />
                <button
                  type="button"
                  onClick={handleCreateContractor}
                  style={{ padding: '0.45rem 1rem', borderRadius: '4px', background: '#f59e0b', border: 'none', color: 'black', fontWeight: 800, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  เพิ่มช่าง
                </button>
              </div>
            </div>

            {/* Contractors List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {contractors.map(c => (
                <div key={c.id} style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {c.name}
                      <span style={{ fontSize: '0.72rem', color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                        ⭐ {c.rating}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        ({c.completed_jobs || 0} งานสำเร็จ)
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      📞 {c.phone || '-'} • LINE: {c.line_id || '-'} {c.contact_person ? `• ติดต่อ: ${c.contact_person}` : ''}
                    </div>
                    {c.skills && c.skills.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                        {c.skills.map((sk, sIdx) => (
                          <span key={sIdx} style={{ fontSize: '0.68rem', background: 'rgba(255,255,255,0.06)', padding: '0.1rem 0.35rem', borderRadius: '3px', color: 'var(--text-muted)' }}>
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
