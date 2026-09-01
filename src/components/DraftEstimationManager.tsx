import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FileSpreadsheet, Plus, Search, Trash2, Edit3, CheckCircle, 
  ArrowUpRight, Eye, RefreshCw, DollarSign, Calendar, User as UserIcon, 
  Building, Phone, MapPin, Tag, ListPlus, X, Check, FileCheck, Layers, 
  Sparkles, TrendingUp, Award, Zap, ChevronRight, Calculator, CheckSquare, 
  AlertCircle, ShieldCheck, HardHat, Hammer, Wrench, Users, ArrowRight,
  Target, ExternalLink, FileText, UserCheck, CheckCircle2, Navigation
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
  description?: string;
  quantity: number;
  unit: string;
  price_book_id?: string | null;
  selected_contractor_id?: string | null;
  selected_contractor_name?: string | null;
  selected_material_unit_cost?: number;
  selected_labor_unit_cost?: number;
  selected_cost_material?: number;
  selected_cost_labor?: number;
  selected_unit_cost?: number;
  selected_total_cost?: number;
  customer_unit_price?: number;
  customer_total_price?: number;
  target_margin_percent?: number;
  selling_unit_price?: number;
  selling_total_price?: number;
  sort_order?: number;
}

interface ContractorBidItem {
  id?: string;
  draft_item_id: string;
  material_unit_price?: number;
  labor_unit_price?: number;
  total_unit_price?: number;
  cost_material?: number;
  cost_labor?: number;
  total_unit_cost?: number;
  total_amount?: number;
  remark?: string;
  notes?: string;
  is_selected?: boolean;
}

interface ContractorBid {
  id: string;
  draft_estimation_id: string;
  contractor_id?: string | null;
  contractor_name: string;
  bid_date?: string;
  contractor_phone?: string;
  contractor_skills?: string[];
  contractor_rating?: number;
  total_bid_amount: number;
  estimated_days?: number;
  lead_time_days?: number;
  status?: string;
  notes?: string;
  items?: ContractorBidItem[];
}

interface DraftEstimation {
  id: string;
  estimation_number: string;
  title: string;
  lead_id?: string | null;
  project_id?: string | null;
  customer_id?: string | null;
  customer_name: string;
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
  lead_customer_phone?: string;
  lead_customer_address?: string;
  lead_job_type?: string;
  lead_branch?: string;
  lead_status?: string;
  lead_source?: string;
  lead_project_id?: string | null;
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
  branches?: any[];
}

const COMMON_AREAS = [
  'ห้องนั่งเล่น / โถงรับแขก', 'ห้องนอนใหญ่ (Master Bedroom)', 'ห้องนอน 2', 'ห้องครัว (Kitchen)', 
  'ห้องน้ำ 1', 'ห้องน้ำ 2', 'ระเบียง / ซักล้าง', 'ภายนอกอาคาร / โรงรถ', 'ทั้งหลัง (เหมาทั้งพื้นที่)'
];

const COMMON_TRADES = [
  'งานไฟฟ้า & สื่อสาร', 'งานฝ้าเพดาน & ผนังเบา', 'งานแอร์ & ระบายอากาศ', 
  'งานประปา & สุขาภิบาล', 'งานทาสี', 'งานปูกระเบื้อง & พื้น', 'งานบิวท์อิน & ตกแต่ง', 'งานรื้อถอน & โครงสร้าง'
];

// Helper to extract rooms & work types from Lead notes/work_areas
const parseLeadRoomsToScopeItems = (lead: any): DraftEstimationItem[] => {
  const items: DraftEstimationItem[] = [];
  
  if (lead && lead.notes) {
    try {
      const parsedNotes = typeof lead.notes === 'string' && (lead.notes.startsWith('{') || lead.notes.startsWith('['))
        ? JSON.parse(lead.notes)
        : null;

      if (parsedNotes) {
        if (Array.isArray(parsedNotes.room_details) && parsedNotes.room_details.length > 0) {
          parsedNotes.room_details.forEach((r: any) => {
            const rName = r.room_name || 'พื้นที่ทั่วไป';
            if (Array.isArray(r.work_types) && r.work_types.length > 0) {
              r.work_types.forEach((wt: string) => {
                items.push({
                  area_name: rName,
                  trade_category: wt || 'งานทั่วไป',
                  item_name: `งาน${wt} (${rName})`,
                  specs_description: r.notes || r.custom_work_type || '',
                  quantity: 1,
                  unit: 'ชุด',
                  selected_material_unit_cost: 0,
                  selected_labor_unit_cost: 0
                });
              });
            } else {
              items.push({
                area_name: rName,
                trade_category: 'งานทั่วไป',
                item_name: `งานปรับปรุง ${rName}`,
                specs_description: r.notes || '',
                quantity: 1,
                unit: 'ชุด',
                selected_material_unit_cost: 0,
                selected_labor_unit_cost: 0
              });
            }
          });
          if (items.length > 0) return items;
        }

        if (Array.isArray(parsedNotes.work_areas) && parsedNotes.work_areas.length > 0) {
          parsedNotes.work_areas.forEach((area: string) => {
            items.push({
              area_name: area,
              trade_category: 'งานทั่วไป',
              item_name: `งานรีโนเวท/ปรับปรุง (${area})`,
              specs_description: '',
              quantity: 1,
              unit: 'ชุด',
              selected_material_unit_cost: 0,
              selected_labor_unit_cost: 0
            });
          });
          if (items.length > 0) return items;
        }
      }
    } catch {
      // not json
    }
  }

  if (lead && Array.isArray(lead.work_areas) && lead.work_areas.length > 0) {
    lead.work_areas.forEach((area: string) => {
      items.push({
        area_name: area,
        trade_category: 'งานทั่วไป',
        item_name: `งานรีโนเวท/ปรับปรุง (${area})`,
        specs_description: '',
        quantity: 1,
        unit: 'ชุด',
        selected_material_unit_cost: 0,
        selected_labor_unit_cost: 0
      });
    });
    return items;
  }

  return [
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
  ];
};

export const DraftEstimationManager: React.FC<DraftEstimationManagerProps> = ({ currentUser, branches = [] }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [estimations, setEstimations] = useState<DraftEstimation[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [priceBook, setPriceBook] = useState<ServicePriceItem[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
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

  // Lead-centric Draft Creation Form State
  const [creationMode, setCreationMode] = useState<'existing_lead' | 'new_lead'>('existing_lead');
  const [selectedLeadObj, setSelectedLeadObj] = useState<any | null>(null);
  const [leadSearchFilter, setLeadSearchFilter] = useState('');
  const [filterOnlyDesignApproved, setFilterOnlyDesignApproved] = useState(true);

  const [formTitle, setFormTitle] = useState('');
  const [formCustomerId, setFormCustomerId] = useState('');
  const [formCustomerFirstName, setFormCustomerFirstName] = useState('');
  const [formCustomerLastName, setFormCustomerLastName] = useState('');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formProjectType, setFormProjectType] = useState('Renovate');
  const [formBranch, setFormBranch] = useState('สำนักงานใหญ่ (HQ)');
  const [formBuildingType, setFormBuildingType] = useState('บ้านเดี่ยว');
  const [formInitialBudget, setFormInitialBudget] = useState('');
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
      const [estRes, contRes, pbRes, leadsRes, custRes] = await Promise.all([
        fetch('/api/estimations'),
        fetch('/api/estimations/contractors'),
        fetch('/api/pricebook'),
        fetch('/api/leads'),
        fetch('/api/customers')
      ]);

      if (estRes.ok) setEstimations(await estRes.json());
      if (contRes.ok) setContractors(await contRes.json());
      if (pbRes.ok) setPriceBook(await pbRes.json());
      if (leadsRes.ok) {
        const lData = await leadsRes.json();
        setLeads(Array.isArray(lData) ? lData : (lData.data || []));
      }
      if (custRes && custRes.ok) {
        const cData = await custRes.json();
        setCustomers(Array.isArray(cData) ? cData : (cData.data || []));
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const hasHandledLeadParam = useRef(false);

  // Check URL query param ?leadId=... on load (only once, and not if already in detail view)
  useEffect(() => {
    if (hasHandledLeadParam.current || activeEstimation) return;
    const params = new URLSearchParams(location.search);
    const leadIdParam = params.get('leadId') || (location.state as any)?.leadId;
    if (leadIdParam && leads.length > 0) {
      const found = leads.find(l => String(l.id) === leadIdParam);
      if (found) {
        hasHandledLeadParam.current = true;
        setCreationMode('existing_lead');
        handleSelectLead(found.id, found);
        setIsCreateModalOpen(true);
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {}
      }
    }
  }, [location.search, location.state, leads, activeEstimation]);

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

  // Reset Create Form
  const resetCreateForm = () => {
    setCreationMode('existing_lead');
    setSelectedLeadObj(null);
    setLeadSearchFilter('');
    setFilterOnlyDesignApproved(true);
    setFormTitle('');
    setFormCustomerId('');
    setFormCustomerFirstName('');
    setFormCustomerLastName('');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerAddress('');
    setFormProjectType('Renovation');
    setFormBranch(branches.length > 0 ? branches[0].name : 'สำนักงานใหญ่ (HQ)');
    setFormBuildingType('บ้านเดี่ยว');
    setFormInitialBudget('');
    setFormTargetMargin(35);
    setFormVatType('Exclude VAT');
    setFormNotes('');
    setFormLeadId('');
    setFormItems([
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
  };

  // Handle Pick Lead
  const handleSelectLead = (leadId: string, leadObjPassed?: any) => {
    setFormLeadId(leadId);
    if (!leadId) {
      setSelectedLeadObj(null);
      return;
    }
    const lead = leadObjPassed || leads.find(l => String(l.id) === leadId);
    if (!lead) return;

    setSelectedLeadObj(lead);
    setFormCustomerId(lead.customer_id || '');
    
    const fName = lead.customer_first_name || (lead.customer_name ? lead.customer_name.split(' ')[0] : '');
    const lName = lead.customer_last_name || (lead.customer_name ? lead.customer_name.split(' ').slice(1).join(' ') : '');
    const fullName = lead.customer_name || `${fName} ${lName}`.trim();
    
    setFormCustomerFirstName(fName || '');
    setFormCustomerLastName(lName || '');
    setFormCustomerName(fullName);
    setFormCustomerPhone(lead.customer_phone || lead.phone || '');
    setFormCustomerAddress(lead.customer_address || lead.address || '');
    setFormProjectType(lead.job_type || 'Renovation');
    setFormBranch(lead.branch || (branches.length > 0 ? branches[0].name : 'สำนักงานใหญ่ (HQ)'));
    
    let bType = 'บ้านเดี่ยว';
    let budget = '';
    if (lead.notes) {
      try {
        const parsed = typeof lead.notes === 'string' && (lead.notes.startsWith('{') || lead.notes.startsWith('[')) ? JSON.parse(lead.notes) : null;
        if (parsed?.building_type) bType = parsed.building_type;
        if (parsed?.initial_budget) budget = parsed.initial_budget;
      } catch (e) {}
    }
    setFormBuildingType(bType);
    setFormInitialBudget(budget);
    
    setFormTitle(`ประมาณการงาน ${fullName} (${lead.job_type || 'Renovation'})`);

    const parsedScope = parseLeadRoomsToScopeItems(lead);
    if (parsedScope.length > 0) {
      setFormItems(parsedScope);
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

  // Save new Draft Estimation (Creates Lead first if new_lead mode to ensure unified dataset)
  const handleSaveEstimation = async () => {
    if (!formTitle.trim()) {
      alert('กรุณาระบุชื่องานประมาณการ');
      return;
    }
    const fullName = `${formCustomerFirstName.trim()} ${formCustomerLastName.trim()}`.trim() || formCustomerName.trim();
    if (!fullName) {
      alert('กรุณาระบุชื่อลูกค้า');
      return;
    }
    if (formItems.length === 0) {
      alert('กรุณาเพิ่มรายการงานอย่างน้อย 1 รายการ');
      return;
    }

    try {
      let activeLeadId = formLeadId;

      // If New Lead mode, create Lead record first so data is unified right from the start!
      if (creationMode === 'new_lead' || !activeLeadId) {
        try {
          const leadPayload = {
            customer_first_name: formCustomerFirstName.trim(),
            customer_last_name: formCustomerLastName.trim(),
            customer_name: fullName,
            customer_phone: formCustomerPhone.trim(),
            customer_address: formCustomerAddress.trim(),
            job_type: formProjectType || 'Renovation',
            branch: formBranch || (branches.length > 0 ? branches[0].name : 'สำนักงานใหญ่ (HQ)'),
            notes: JSON.stringify({
              building_type: formBuildingType || 'บ้านเดี่ยว',
              initial_budget: formInitialBudget || '',
              work_areas: Array.from(new Set(formItems.map(it => it.area_name))),
              notes: formNotes || ''
            }),
            sales_contact_id: currentUser?.id || null
          };

          const leadRes = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
            body: JSON.stringify(leadPayload)
          });

          if (leadRes.ok) {
            const createdLead = await leadRes.json();
            activeLeadId = createdLead.id;
          }
        } catch (err) {
          console.error('Error creating unified lead:', err);
        }
      }

      const body = {
        title: formTitle,
        customer_id: formCustomerId || null,
        customer_name: fullName,
        customer_phone: formCustomerPhone,
        customer_address: formCustomerAddress,
        project_type: formProjectType,
        lead_id: activeLeadId || null,
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
        const errData = await res.json();
        alert(errData.error || 'Failed to save estimation');
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
              resetCreateForm();
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
                  <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeEstimation.title}</span>
                  <span style={{ background: 'rgba(0, 206, 209, 0.15)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '0.2rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800 }}>
                    {activeEstimation.estimation_number}
                  </span>
                  <span style={{
                    padding: '0.2rem 0.7rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800,
                    background: activeEstimation.status === 'Converted' ? 'rgba(16, 185, 129, 0.25)' : activeEstimation.status === 'Comparing' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                    color: activeEstimation.status === 'Converted' ? '#10b981' : activeEstimation.status === 'Comparing' ? '#60a5fa' : '#f59e0b'
                  }}>
                    ● {activeEstimation.status}
                  </span>
                </div>

                {/* Primary Customer & Lead Showcase Box */}
                <div style={{
                  marginTop: '0.85rem',
                  padding: '1rem 1.25rem',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(30, 41, 59, 0.8) 100%)',
                  border: '1.5px solid rgba(0, 206, 209, 0.35)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem'
                }}>
                  {/* Top Row: Customer Name (Large & Bold), Phone Pill, and Lead ID */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          👤 ข้อมูลลูกค้า:
                        </span>
                        <span style={{ fontSize: '1.28rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                          {activeEstimation.customer_name || activeEstimation.lead_customer_name || 'ไม่ระบุชื่อลูกค้า'}
                        </span>
                      </div>

                      {(activeEstimation.customer_phone || activeEstimation.lead_customer_phone) && (
                        <a 
                          href={`tel:${activeEstimation.customer_phone || activeEstimation.lead_customer_phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            background: 'rgba(16, 185, 129, 0.18)',
                            border: '1px solid #10b981',
                            color: '#34d399',
                            padding: '0.3rem 0.8rem',
                            borderRadius: '20px',
                            fontSize: '0.95rem',
                            fontWeight: 800,
                            textDecoration: 'none'
                          }}
                          title="คลิกเพื่อโทรออก"
                        >
                          <Phone size={14} /> {activeEstimation.customer_phone || activeEstimation.lead_customer_phone}
                        </a>
                      )}

                      {activeEstimation.lead_id ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(139, 92, 246, 0.22)',
                          border: '1.5px solid #a78bfa',
                          color: '#c4b5fd',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.9rem',
                          fontWeight: 800
                        }}>
                          <Target size={14} color="#a78bfa" />
                          รหัส Lead: <strong>{activeEstimation.lead_id}</strong>
                        </span>
                      ) : (
                        <span style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-muted)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '20px',
                          fontSize: '0.78rem'
                        }}>
                          สร้างตรง (Direct Customer)
                        </span>
                      )}
                    </div>

                    {/* Link button to Leads Page */}
                    {activeEstimation.lead_id && (
                      <a
                        href="/leads"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          color: 'var(--accent-primary)',
                          textDecoration: 'none',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          padding: '0.35rem 0.85rem',
                          borderRadius: '8px',
                          background: 'rgba(0, 206, 209, 0.12)',
                          border: '1px solid var(--accent-primary)'
                        }}
                        title="เปิดดูประวัติและขั้นตอนในหน้า Leads"
                      >
                        <ExternalLink size={14} /> เปิดดูในหน้า Leads
                      </a>
                    )}
                  </div>

                  {/* Second Row: Detailed Information Pills */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.25rem',
                    flexWrap: 'wrap',
                    paddingTop: '0.45rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    fontSize: '0.86rem',
                    color: '#cbd5e1'
                  }}>
                    <span>
                      🏢 สาขา: <strong style={{ color: '#ffffff' }}>{activeEstimation.lead_branch || 'สำนักงานใหญ่ (HQ)'}</strong>
                    </span>
                    <span>
                      🏷️ ประเภทงาน: <strong style={{ color: '#ffffff' }}>{activeEstimation.project_type || activeEstimation.lead_job_type || 'Renovation'}</strong>
                    </span>
                    {activeEstimation.lead_status && (
                      <span>
                        📊 สถานะ Lead: <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.78rem' }}>{activeEstimation.lead_status}</span>
                      </span>
                    )}
                    {(activeEstimation.customer_address || activeEstimation.lead_customer_address) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={13} color="var(--accent-primary)" />
                        สถานที่: <span style={{ color: '#ffffff' }}>{activeEstimation.customer_address || activeEstimation.lead_customer_address}</span>
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#94a3b8' }}>
                      📅 วันที่สร้าง: {formatToDDMMYYYY(activeEstimation.created_at)}
                    </span>
                  </div>
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
                                background: isCurrentlySelected ? 'rgba(16, 185, 129, 0.12)' : isLowest ? 'rgba(16, 185, 129, 0.04)' : 'transparent'
                              }}
                            >
                              {totalUnit > 0 ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.96rem', color: isLowest ? '#34d399' : '#f8fafc' }}>
                                      ฿{totalUnit.toLocaleString()}
                                    </span>
                                    {isLowest && (
                                      <span style={{ fontSize: '0.68rem', background: 'rgba(16,185,129,0.25)', border: '1px solid #10b981', color: '#34d399', padding: '0.08rem 0.35rem', borderRadius: '4px', fontWeight: 800 }}>
                                        Best 🟢
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '0.74rem', color: '#cbd5e1', marginTop: '0.15rem' }}>
                                    ของ: <strong style={{ color: '#ffffff' }}>{mat.toLocaleString()}</strong> • แรง: <strong style={{ color: '#ffffff' }}>{lab.toLocaleString()}</strong>
                                  </div>
                                  <div style={{ marginTop: '0.35rem' }}>
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
                                        padding: '0.3rem 0.65rem',
                                        borderRadius: '6px',
                                        background: isCurrentlySelected 
                                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                                          : 'rgba(59, 130, 246, 0.15)',
                                        border: isCurrentlySelected 
                                          ? '1px solid #10b981' 
                                          : '1px solid rgba(59, 130, 246, 0.35)',
                                        color: isCurrentlySelected ? '#ffffff' : '#60a5fa',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.25rem',
                                        boxShadow: isCurrentlySelected ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
                                        transition: 'all 0.15s ease'
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
                onClick={() => {
                  resetCreateForm();
                  setIsCreateModalOpen(true);
                }}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                        <span>👤 ลูกค้า: <strong style={{ color: 'var(--text-primary)' }}>{est.customer_name || est.lead_customer_name || 'ไม่ระบุ'}</strong> {est.customer_phone ? `(${est.customer_phone})` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        {est.lead_id ? (
                          <span style={{ fontSize: '0.73rem', color: '#a78bfa', background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.25)', padding: '0.1rem 0.45rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                            <Target size={11} /> Lead: {est.lead_id}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            Direct
                          </span>
                        )}
                        {est.lead_branch && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            🏢 {est.lead_branch}
                          </span>
                        )}
                      </div>
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
      {/* MODAL: CREATE NEW DRAFT ESTIMATION (LEAD-CENTRIC & UNIFIED DATASET)        */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (() => {
        const totalMaterialBaseline = formItems.reduce((acc, it) => acc + ((Number(it.selected_material_unit_cost) || 0) * (Number(it.quantity) || 1)), 0);
        const totalLaborBaseline = formItems.reduce((acc, it) => acc + ((Number(it.selected_labor_unit_cost) || 0) * (Number(it.quantity) || 1)), 0);
        const totalCostBaseline = totalMaterialBaseline + totalLaborBaseline;
        const targetSellingEst = formTargetMargin < 100 ? totalCostBaseline / (1 - (formTargetMargin / 100)) : totalCostBaseline * 1.35;

        // IDs of leads that already have an existing estimation
        const existingDraftLeadIds = new Set(estimations.map(e => String(e.lead_id || '')).filter(Boolean));

        // Filter eligible leads based on Design Approved status & no existing draft estimation
        const eligibleLeads = leads.filter(l => {
          const isDesignApproved = l.status === 'Design Approved';
          const alreadyEstimated = existingDraftLeadIds.has(String(l.id));
          if (filterOnlyDesignApproved) {
            return isDesignApproved && !alreadyEstimated;
          }
          return true;
        });

        // Filter leads for search
        const filteredLeadsForSelect = eligibleLeads.filter(l => {
          if (!leadSearchFilter.trim()) return true;
          const q = leadSearchFilter.toLowerCase();
          return (
            (l.id && l.id.toLowerCase().includes(q)) ||
            (l.customer_name && l.customer_name.toLowerCase().includes(q)) ||
            (l.customer_phone && l.customer_phone.toLowerCase().includes(q)) ||
            (l.branch && l.branch.toLowerCase().includes(q)) ||
            (l.job_type && l.job_type.toLowerCase().includes(q))
          );
        });

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div
              className="glass-panel"
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '16px',
                width: '96vw',
                maxWidth: '1440px',
                height: '94vh',
                maxHeight: '94vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(0, 206, 209, 0.4)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                overflow: 'hidden'
              }}
            >
              {/* Modal Header */}
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 206, 209, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 206, 209, 0.3)' }}>
                    <FileSpreadsheet color="var(--accent-primary)" size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      สร้าง Draft ประมาณการต้นทุน (เชื่อมโยงฐานข้อมูล Lead & ลูกค้า)
                    </h2>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>
                      ดึงข้อมูลลูกค้าและขอบเขตงานจาก Lead เพื่อเป็นชุดข้อมูลเดียวกันตั้งแต่เริ่มต้นสู่การถอดแบบและเสนอราคา
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Mode Switcher Tabs */}
                  <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button
                      type="button"
                      onClick={() => setCreationMode('existing_lead')}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: creationMode === 'existing_lead' ? 'var(--accent-primary)' : 'transparent',
                        color: creationMode === 'existing_lead' ? 'black' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Target size={14} /> 🔍 เลือกลีดเดิมในระบบ ({eligibleLeads.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreationMode('new_lead');
                        setFormLeadId('');
                        setSelectedLeadObj(null);
                      }}
                      style={{
                        padding: '0.35rem 0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: creationMode === 'new_lead' ? 'var(--accent-primary)' : 'transparent',
                        color: creationMode === 'new_lead' ? 'black' : 'var(--text-secondary)',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Plus size={14} /> ➕ สร้าง Lead ใหม่และถอดแบบ
                    </button>
                  </div>

                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Modal Body (Scrollable) */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. Lead / Customer Source Section */}
                {creationMode === 'existing_lead' ? (
                  <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(0, 206, 209, 0.3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={18} color="var(--accent-primary)" />
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          เลือกลูกค้าจากฐานข้อมูล Leads
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        * เลือก Lead เพื่อดึงข้อมูลลูกค้า, ที่อยู่หน้างาน และห้องที่ต้องการทำให้อัตโนมัติ
                      </span>
                    </div>

                    {/* Search & Select Lead */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="พิมพ์ค้นหาชื่อลูกค้า, เบอร์โทร, รหัส Lead..."
                          value={leadSearchFilter}
                          onChange={e => setLeadSearchFilter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem 0.55rem 2rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.82rem'
                          }}
                        />
                      </div>

                      <select
                        value={formLeadId}
                        onChange={e => handleSelectLead(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(0, 206, 209, 0.4)',
                          color: 'var(--text-primary)',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="">
                          {filteredLeadsForSelect.length > 0
                            ? `-- กรุณาเลือกลีด (${filteredLeadsForSelect.length} รายการที่พร้อมถอด BOQ) --`
                            : `-- ไม่พบลีดที่พร้อมทำ BOQ (สถานะ 'Design Approved' ที่ยังไม่มี BOQ) --`}
                        </option>
                        {filteredLeadsForSelect.map(l => {
                          const lName = l.customer_name || `${l.customer_first_name || ''} ${l.customer_last_name || ''}`.trim() || 'ไม่ระบุชื่อ';
                          const lPhone = l.customer_phone || l.phone || '';
                          const lBranch = l.branch || 'HQ';
                          const lJob = l.job_type || 'Renovation';
                          const isDesignApproved = l.status === 'Design Approved';
                          const hasExistingDraft = existingDraftLeadIds.has(String(l.id));

                          let statusBadge = '🟢 Design Approved';
                          if (hasExistingDraft) {
                            statusBadge = '⚠️ มี BOQ แล้ว';
                          } else if (!isDesignApproved) {
                            statusBadge = `⏳ ${l.status || 'รออนุมัติแบบ'}`;
                          }

                          return (
                            <option key={l.id} value={l.id}>
                              🎯 [{l.id}] {lName} | [{statusBadge}] | 📞 {lPhone} | 🏢 {lBranch} ({lJob})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Filter Toggle & Counter Bar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.4rem 0.75rem', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', fontSize: '0.78rem', color: filterOnlyDesignApproved ? '#34d399' : 'var(--text-muted)', fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={filterOnlyDesignApproved}
                          onChange={e => setFilterOnlyDesignApproved(e.target.checked)}
                          style={{ accentColor: '#10b981', cursor: 'pointer' }}
                        />
                        <span>🛡️ กรองเฉพาะ Lead ที่สถานะ <strong>Design Approved</strong> และยังไม่มี BOQ</span>
                      </label>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        แสดง {filteredLeadsForSelect.length} / {leads.length} ลีด
                      </span>
                    </div>

                    {/* Selected Lead Highlight Banner */}
                    {selectedLeadObj && (
                      <div style={{ background: 'rgba(0, 206, 209, 0.08)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid rgba(0, 206, 209, 0.25)', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                              <span style={{ background: 'var(--accent-primary)', color: 'black', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                                {selectedLeadObj.id}
                              </span>
                              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                                {selectedLeadObj.customer_name || `${formCustomerFirstName} ${formCustomerLastName}`}
                              </strong>
                              {selectedLeadObj.customer_phone && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                  📞 {selectedLeadObj.customer_phone}
                                </span>
                              )}
                              <span style={{ fontSize: '0.75rem', color: '#60a5fa', background: 'rgba(59,130,246,0.15)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                🏢 {selectedLeadObj.branch || 'สำนักงานใหญ่'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              📍 หน้างาน: {selectedLeadObj.customer_address || 'ไม่ระบุสถานที่ติดตั้ง'} | 🏷️ ประเภท: {selectedLeadObj.job_type || 'Renovation'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            <CheckCircle2 size={14} /> เชื่อมต่อกับข้อมูล Lead สำเร็จ
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Common Parameters Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ชื่องานประมาณการ *
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น งานรีโนเวทห้องชุด 45 ตร.ม. คอนโด The Line หรือ งานต่อเติมครัว"
                          value={formTitle}
                          onChange={e => setFormTitle(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ประเภทโครงการ
                        </label>
                        <select
                          value={formProjectType}
                          onChange={e => setFormProjectType(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="Renovation">🏡 Renovate Service</option>
                          <option value="MA Service">🔧 MA Service</option>
                          <option value="Quick Service">⚡ Quick Service</option>
                          <option value="Built-in Design">🛋️ Built-in Design</option>
                          <option value="New House Build">🏗️ New House Build</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Target Margin (%)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="5"
                            max="80"
                            value={formTargetMargin}
                            onChange={e => setFormTargetMargin(Number(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              paddingRight: '2rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--accent-primary)',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Specific Fields: First Name, Last Name, Phone, Address */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 2fr', gap: '1rem', marginTop: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ชื่อลูกค้า (First Name) *
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น สมชาย"
                          value={formCustomerFirstName}
                          onChange={e => {
                            const fName = e.target.value;
                            setFormCustomerFirstName(fName);
                            setFormCustomerName(`${fName} ${formCustomerLastName}`.trim());
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          นามสกุล (Last Name)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ใจดี"
                          value={formCustomerLastName}
                          onChange={e => {
                            const lName = e.target.value;
                            setFormCustomerLastName(lName);
                            setFormCustomerName(`${formCustomerFirstName} ${lName}`.trim());
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          เบอร์โทรศัพท์
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 081-234-5678"
                          value={formCustomerPhone}
                          onChange={e => setFormCustomerPhone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          สถานที่หน้างาน / ที่อยู่ติดตั้ง
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น อาคาร A ชั้น 12 คอนโด The Line ถ.สุขุมวิท 71"
                          value={formCustomerAddress}
                          onChange={e => setFormCustomerAddress(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Mode 2: Create New Lead & Draft Simultaneously */
                  <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Sparkles size={18} color="#34d399" />
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          สร้าง Lead ใหม่ลงในระบบพร้อมสร้าง Draft ประมาณการ
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 600 }}>
                        ✓ ข้อมูลจะถูกบันทึกลงใน Leads และเชื่อมโยงกับ Draft ทันที
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr 1.2fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ชื่อลูกค้า (First Name) *
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น สมชาย"
                          value={formCustomerFirstName}
                          onChange={e => {
                            const fName = e.target.value;
                            setFormCustomerFirstName(fName);
                            setFormCustomerName(`${fName} ${formCustomerLastName}`.trim());
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          นามสกุล (Last Name)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ใจดี"
                          value={formCustomerLastName}
                          onChange={e => {
                            const lName = e.target.value;
                            setFormCustomerLastName(lName);
                            setFormCustomerName(`${formCustomerFirstName} ${lName}`.trim());
                          }}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          เบอร์โทรศัพท์ *
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 081-234-5678"
                          value={formCustomerPhone}
                          onChange={e => setFormCustomerPhone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          สาขาที่ดูแล (Branch)
                        </label>
                        <select
                          value={formBranch}
                          onChange={e => setFormBranch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          {branches.length > 0 ? (
                            branches.map((b: any) => <option key={b.id || b.code} value={b.name}>{b.name}</option>)
                          ) : (
                            <>
                              <option value="สำนักงานใหญ่ (HQ)">สำนักงานใหญ่ (HQ)</option>
                              <option value="สาขาบางนา">สาขาบางนา</option>
                              <option value="สาขารามอินทรา">สาขารามอินทรา</option>
                              <option value="สาขาพระราม 2">สาขาพระราม 2</option>
                              <option value="สาขารัตนาธิเบศร์">สาขารัตนาธิเบศร์</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ชื่องานประมาณการ *
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น งานรีโนเวทบ้าน 2 ชั้น หรือ งานต่อเติมครัว"
                          value={formTitle}
                          onChange={e => setFormTitle(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ประเภทงาน (Job Type)
                        </label>
                        <select
                          value={formProjectType}
                          onChange={e => setFormProjectType(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="Renovation">🏡 Renovate Service</option>
                          <option value="MA Service">🔧 MA Service</option>
                          <option value="Quick Service">⚡ Quick Service</option>
                          <option value="Built-in Design">🛋️ Built-in Design</option>
                          <option value="New House Build">🏗️ New House Build</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          ประเภทอาคาร
                        </label>
                        <select
                          value={formBuildingType}
                          onChange={e => setFormBuildingType(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        >
                          <option value="บ้านเดี่ยว">🏡 บ้านเดี่ยว</option>
                          <option value="ทาวน์เฮ้าส์/ทาวน์โฮม">🏘️ ทาวน์เฮ้าส์ / โฮม</option>
                          <option value="คอนโดมิเนียม">🏢 คอนโดมิเนียม</option>
                          <option value="อาคารพาณิชย์">🏪 อาคารพาณิชย์</option>
                          <option value="สำนักงาน/ออฟฟิศ">💼 สำนักงาน / ออฟฟิศ</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          Target Margin (%)
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="number"
                            min="5"
                            max="80"
                            value={formTargetMargin}
                            onChange={e => setFormTargetMargin(Number(e.target.value))}
                            style={{
                              width: '100%',
                              padding: '0.55rem 0.75rem',
                              paddingRight: '2rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--accent-primary)',
                              fontWeight: 700,
                              fontSize: '0.85rem'
                            }}
                          />
                          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>%</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          สถานที่หน้างาน / ที่อยู่ติดตั้ง
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 123/45 ซ.สุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กทม."
                          value={formCustomerAddress}
                          onChange={e => setFormCustomerAddress(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                          งบประมาณเบื้องต้นของลูกค้า (฿)
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น 250,000"
                          value={formInitialBudget}
                          onChange={e => setFormInitialBudget(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.55rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Scope Items List Section */}
                <div style={{ background: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Layers size={18} color="var(--accent-primary)" />
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        รายการถอดแบบขอบเขตงาน (Scope of Work Items)
                      </span>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', background: 'rgba(0, 206, 209, 0.15)', color: 'var(--accent-primary)', borderRadius: '12px', fontWeight: 700 }}>
                        {formItems.length} รายการ
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm)',
                        background: 'linear-gradient(135deg, rgba(0, 206, 209, 0.2), rgba(0, 128, 255, 0.2))',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Plus size={15} /> + เพิ่มรายการงาน
                    </button>
                  </div>

                  {/* Scope Items Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {formItems.map((it, idx) => {
                      const matCost = Number(it.selected_material_unit_cost) || 0;
                      const labCost = Number(it.selected_labor_unit_cost) || 0;
                      const qty = Number(it.quantity) || 1;
                      const lineUnitCost = matCost + labCost;
                      const lineTotalCost = lineUnitCost * qty;

                      return (
                        <div
                          key={idx}
                          style={{
                            background: 'var(--bg-secondary)',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}
                        >
                          {/* Row 1: Area, Trade Category, Price Book Selector, Delete Button */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr auto', gap: '0.75rem', marginBottom: '0.65rem' }}>
                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>พื้นที่ / ห้อง</span>
                              <select
                                value={it.area_name}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, area_name: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                              >
                                {COMMON_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                              </select>
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>หมวดหมู่งานช่าง</span>
                              <select
                                value={it.trade_category}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, trade_category: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                              >
                                {COMMON_TRADES.map(tr => <option key={tr} value={tr}>{tr}</option>)}
                              </select>
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', display: 'block', marginBottom: '2px', fontWeight: 600 }}>⚡ ดึงจาก Price Book</span>
                              <select
                                onChange={e => handlePickPriceBook(idx, e.target.value)}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid rgba(0,206,209,0.35)', color: 'var(--accent-primary)', fontSize: '0.82rem', fontWeight: 500 }}
                              >
                                <option value="">-- เลือกรายการจาก Price Book --</option>
                                {priceBook.map(pb => (
                                  <option key={pb.id} value={pb.id}>{pb.service_name} ({pb.category})</option>
                                ))}
                              </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                title="ลบรายการนี้"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.25)',
                                  borderRadius: '6px',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '0.45rem 0.6rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Row 2: Item Name, Specs, Qty, Unit, Material Cost, Labor Cost, Total Line Preview */}
                          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 2fr 0.7fr 0.7fr 1fr 1fr 1.3fr', gap: '0.65rem', alignItems: 'flex-end' }}>
                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>ชื่องาน (Item Name) *</span>
                              <input
                                type="text"
                                placeholder="เช่น รื้อถอนสุขภัณฑ์เดิม หรือ ทาสีรองพื้นปูนเก่า"
                                value={it.item_name}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, item_name: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                              />
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>สเปก / สเปกวัสดุ (Specs)</span>
                              <input
                                type="text"
                                placeholder="เช่น ยี่ห้อ, ขนาด, คุณสมบัติเฉพาะ"
                                value={it.specs_description || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, specs_description: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem' }}
                              />
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textAlign: 'right' }}>จำนวน</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="1"
                                value={it.quantity}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, quantity: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'right' }}
                              />
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textAlign: 'center' }}>หน่วย</span>
                              <input
                                type="text"
                                placeholder="เช่น จุด"
                                value={it.unit}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, unit: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'center' }}
                              />
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textAlign: 'right' }}>ทุนค่าของ / หน่วย</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={it.selected_material_unit_cost || ''}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, selected_material_unit_cost: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'right' }}
                              />
                            </div>

                            <div>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', textAlign: 'right' }}>ทุนค่าแรง / หน่วย</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder="0"
                                value={it.selected_labor_unit_cost || ''}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setFormItems(prev => prev.map((item, i) => i === idx ? { ...item, selected_labor_unit_cost: val } : item));
                                }}
                                style={{ width: '100%', padding: '0.45rem 0.5rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.82rem', textAlign: 'right' }}
                              />
                            </div>

                            {/* Line Cost Summary Pill */}
                            <div style={{ background: 'var(--bg-tertiary)', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                ทุน/หน่วย: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>฿{lineUnitCost.toLocaleString()}</span>
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                รวม: ฿{lineTotalCost.toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer (Sticky Bottom with Live Cost Summary and Actions) */}
              <div style={{ flexShrink: 0, padding: '0.85rem 1.75rem', background: 'var(--bg-tertiary)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                {/* Left: Summary Metrics */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>รายการ:</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{formItems.length} รายการ</strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ทุนค่าของ:</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>฿{totalMaterialBaseline.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>ทุนค่าแรง:</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>฿{totalLaborBaseline.toLocaleString()}</strong>
                  </div>
                  <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>รวมต้นทุนฐาน:</span>
                    <strong style={{ fontSize: '0.95rem', color: '#f59e0b' }}>฿{totalCostBaseline.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ราคาขายเป้าหมาย (Margin {formTargetMargin}%):</span>
                    <strong style={{ fontSize: '1rem', color: 'var(--accent-primary)', fontWeight: 800 }}>
                      ฿{Math.round(targetSellingEst).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    style={{
                      padding: '0.6rem 1.25rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEstimation}
                    className="hover-lift"
                    style={{
                      padding: '0.6rem 1.6rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'linear-gradient(135deg, var(--accent-primary), #0080ff)',
                      border: 'none',
                      color: 'white',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      boxShadow: '0 4px 14px rgba(0, 206, 209, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={18} />
                    {creationMode === 'new_lead' ? '✓ บันทึก Lead & Draft ประมาณการ' : '✓ บันทึก Draft ประมาณการ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
