import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Check, CheckCircle2, RefreshCw, X, Search, FileText, Phone, Building, Edit2, MapPin, Navigation, ExternalLink, Compass, Map, Search as SearchIcon, Clipboard, ClipboardCheck, Sparkles, Calendar, Clock, History, AlertCircle, Home, Palette, DollarSign, CreditCard, MoreVertical, ShieldCheck, ShieldAlert, Lock, Building2, User } from 'lucide-react';
import type { User as UserType, Customer, CustomerSite } from '../types';
import { formatToDDMMYYYY, getTodayDateString, isDateInPast } from '../utils';
import { CustomDateInput } from './CustomDateInput';
import { GisMapPickerModal, formatToDMS } from './GisMapPickerModal';
import { SiteVisitApprovalManager } from './SiteVisitApprovalManager';
import { SiteVisitResultModal } from './SiteVisitResultModal';
import { DesignApprovalModal } from './DesignApprovalModal';
import { PaymentModal } from './PaymentModal';
import { LeadTimelineModal } from './LeadTimelineModal';
import { SearchableBranchSelect } from './SearchableBranchSelect';
import { QcBookingModal } from './QcBookingModal';

interface LeadFollowup {
  id: string;
  lead_id: string;
  activity_type: string;
  appointment_date?: string | null;
  appointment_time?: string | null;
  assignee_name?: string | null;
  notes?: string | null;
  created_at: string;
  created_by?: string | null;
}

interface Lead {
  id: string;
  customer_id?: string | null;
  customer_site_id?: string | null;
  customer_name: string;
  customer_first_name?: string;
  customer_last_name?: string;
  customer_phone: string;
  customer_address: string;
  customer_latitude?: number | string | null;
  customer_longitude?: number | string | null;
  map_url?: string | null;
  job_type: string;
  status: string;
  appointment_date?: string | null;
  appointment_type?: string | null;
  appointment_assignee?: string | null;
  site_visit_approval_status?: 'None' | 'Pending' | 'Approved' | 'Rejected' | string;
  site_visit_approved_by?: string | null;
  site_visit_approved_at?: string | null;
  site_visit_approval_notes?: string | null;
  notes: string;

  created_at: string;
  updated_at: string;
  project_id: string | null;
  building_type?: string;
  custom_building_type?: string;
  area_size?: string;
  initial_budget?: string;
  payment_method?: string;
  work_areas?: string[];
  required_work_types?: string[];
  custom_required_work_type?: string;
  branch?: string;
  coordinator_name?: string | null;
  coordinator_phone?: string | null;
  coordinator_line_id?: string | null;
  survey_date?: string | null;
  surveyor_id?: string | null;
  sales_contact_id?: string | null;
}

interface LeadsPageProps {
  currentUser: UserType | null;
  branches?: any[];
  users?: UserType[];
}

export interface LeadRoomDetail {
  id: string;
  room_name: string;
  room_size?: string;
  work_types: string[];
  custom_work_type?: string;
  notes?: string;
}

const ROOM_NAME_ICONS: Record<string, string> = {
  'ห้องรับแขก': '🛋️',
  'ห้องครัว': '🍳',
  'ห้องน้ำ/ห้องส้วม': '🚿',
  'ลาน/สนามหญ้า': '🌳',
  'ลานซักล้าง': '🧺',
  'ตกแต่งภายนอก': '🏡',
  'ห้องนอน': '🛏️',
  'ห้องโถง/ห้องรับแขก': '🏛️',
  'สำนักงาน/ออฟฟิศ': '💼',
  'ลานจอดรถ': '🚗',
};

const getRoomNameIcon = (name: string): string => {
  for (const key of Object.keys(ROOM_NAME_ICONS)) {
    if (name.includes(key)) return ROOM_NAME_ICONS[key];
  }
  return '🏠';
};

const RENOVATION_WORK_CARDS = [
  { id: 'งานไฟฟ้า & แสงสว่าง', label: 'งานไฟฟ้า & แสงสว่าง', icon: '💡', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  { id: 'งานปูน & ก่อฉาบ', label: 'งานปูน & ก่อฉาบ', icon: '🧱', color: '#b45309', bg: '#ffedd5', border: '#fed7aa' },
  { id: 'งานกระเบื้อง & ปูพื้น', label: 'งานกระเบื้อง & ปูพื้น', icon: '🔲', color: '#0d9488', bg: '#ccfbf1', border: '#99f6e4' },
  { id: 'งานประปา & สุขภัณฑ์', label: 'งานประปา & สุขภัณฑ์', icon: '💧', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  { id: 'งานฝ้า & ทาสี', label: 'งานฝ้า & ทาสี', icon: '🎨', color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
  { id: 'งานป้องกัน & กันซึม', label: 'งานป้องกัน & กันซึม', icon: '🛡️', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  { id: 'งานประตู-หน้าต่าง & กระจก', label: 'ประตู-หน้าต่าง & กระจก', icon: '🪟', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'งานบิวท์อิน & ตกแต่ง', label: 'งานบิวท์อิน & ตกแต่ง', icon: '🚪', color: '#9333ea', bg: '#fae8ff', border: '#f5d0fe' },
  { id: 'งานอื่นๆ', label: 'อื่นๆ (ระบุเอง)', icon: '🔧', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
];

export const formatLeadCode = (lead: { id: string; created_at?: string } | null | undefined): string => {
  if (!lead || !lead.id) return 'LD-20260824-00001';

  // Format Date: YYYYMMDD
  let datePart = '20260824';
  if (lead.created_at) {
    try {
      const d = new Date(lead.created_at);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      datePart = `${yyyy}${mm}${dd}`;
    } catch {
      datePart = '20260824';
    }
  }

  // Extract running number
  const numMatch = lead.id.match(/\d+$/);
  const numPart = numMatch ? String(parseInt(numMatch[0], 10)).padStart(5, '0') : '00001';

  return `LD-${datePart}-${numPart}`;
};

export const LeadsPage = ({ currentUser, branches = [], users = [] }: LeadsPageProps) => {
  const navigate = useNavigate();
  const isPrivilegedUser = Boolean(
    currentUser && (
      currentUser.globalRole === 'Admin' ||
      currentUser.globalRole === 'Manager' ||
      (currentUser as any).role === 'admin' ||
      (currentUser as any).role === 'manager' ||
      (currentUser as any).role === 'gm' ||
      (currentUser.department && currentUser.department.toLowerCase().includes('management')) ||
      (currentUser.name && currentUser.name.toLowerCase().includes('admin'))
    )
  );

  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [selectedLeadForVisitResult, setSelectedLeadForVisitResult] = useState<Lead | null>(null);

  // Customer Master Auto-Suggest & Site Select
  const [customersMaster, setCustomersMaster] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSites, setCustomerSites] = useState<CustomerSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [newSiteName, setNewSiteName] = useState<string>('');
  const [isSavingLead, setIsSavingLead] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLeads, setTotalLeads] = useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);

  // Phase 13 Modal States
  const [isVisitResultModalOpen, setIsVisitResultModalOpen] = useState(false);
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<Lead | null>(null);

  // Phase 02: Designs Modal States
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [selectedLeadForDesign, setSelectedLeadForDesign] = useState<Lead | null>(null);

  // Phase 02: Payments Modal States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedLeadForPayment, setSelectedLeadForPayment] = useState<Lead | null>(null);

  // Phase 02: Timeline Modal States
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedLeadForTimeline, setSelectedLeadForTimeline] = useState<Lead | null>(null);

  // Site Coordinator State (Phase 12 Mockup)
  const [siteCoordinatorName, setSiteCoordinatorName] = useState('');
  const [siteCoordinatorPhone, setSiteCoordinatorPhone] = useState('');
  const [siteCoordinatorLineId, setSiteCoordinatorLineId] = useState('');
  const [siteMapUrl, setSiteMapUrl] = useState('');

  // Follow-up Modal & History
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedLeadForFollowup, setSelectedLeadForFollowup] = useState<Lead | null>(null);
  const [followupsList, setFollowupsList] = useState<LeadFollowup[]>([]);
  const [isQcBookingModalOpen, setIsQcBookingModalOpen] = useState(false);

  // Follow-up Form states
  const [activityType, setActivityType] = useState('ให้โทรกลับ');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [assigneeName, setAssigneeName] = useState(currentUser?.name || 'แอดมิน');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupNewStatus, setFollowupNewStatus] = useState('Contacted');
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');

  // Form states matching Image 2 mockup
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerLatitude, setCustomerLatitude] = useState<string>('');
  const [customerLongitude, setCustomerLongitude] = useState<string>('');
  const [mapUrl, setMapUrl] = useState<string>('');
  const [smartInput, setSmartInput] = useState<string>('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);
  const [isGisModalOpen, setIsGisModalOpen] = useState(false);
  const [gisTarget, setGisTarget] = useState<'lead' | 'followup'>('lead');
  const [requireVisit, setRequireVisit] = useState(false);
  const [surveyDate, setSurveyDate] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [salesContactId, setSalesContactId] = useState(currentUser?.id || '');
  const [availableSurveyors, setAvailableSurveyors] = useState<any[]>([]);

  const fetchCustomersMaster = async () => {
    try {
      const authUserId = currentUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '');
      const res = await fetch('/api/customers', {
        headers: authUserId ? { 'X-User-Id': authUserId } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCustomersMaster(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching customers master:', err);
    }
  };

  const fetchCustomerSites = async (customerId: string) => {
    try {
      const authUserId = currentUser?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '');
      const res = await fetch(`/api/customers/${customerId}/sites`, {
        headers: authUserId ? { 'X-User-Id': authUserId } : {}
      });
      if (res.ok) {
        const sites: CustomerSite[] = await res.json();
        setCustomerSites(Array.isArray(sites) ? sites : []);
        return sites;
      }
    } catch (err) {
      console.error('Error fetching customer sites:', err);
    }
    return [];
  };

  const handleSelectCustomerFromMaster = async (cust: Customer) => {
    const c = cust as any;
    setSelectedCustomerId(c.id || '');
    
    // For corporate or individual, determine first and last name properly
    let fName = c.firstName || c.first_name || '';
    let lName = c.lastName || c.last_name || '';
    if (!fName && (c.companyName || c.company_name)) {
      fName = c.companyName || c.company_name;
    } else if (!fName && (c.customerName || c.customer_name)) {
      const parts = (c.customerName || c.customer_name).split(' ');
      fName = parts[0];
      if (!lName && parts.length > 1) lName = parts.slice(1).join(' ');
    }
    if (!fName) fName = 'ลูกค้า';

    setFirstName(fName);
    setLastName(lName);

    // Clean phone number to digits only (max 10 digits) so HTML5 pattern="[0-9]*" always passes
    const rawPhone = c.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);
    setCustomerPhone(cleanPhone);

    const displayName = c.companyName || c.company_name || c.customerName || c.customer_name || `${fName} ${lName}`.trim();
    setCustomerSearchQuery(displayName);
    setIsCustomerDropdownOpen(false);

    try {
      const sites = await fetchCustomerSites(c.id);
      if (sites && sites.length > 0) {
        const defaultSite = sites.find((s: any) => s.isDefault || s.is_default) || sites[0];
        handleSelectSite(defaultSite);
      } else {
        setSelectedSiteId('');
        if (c.defaultSiteAddress || c.default_site_address || c.address) {
          setCustomerAddress(c.defaultSiteAddress || c.default_site_address || c.address || '');
        }
        if (c.defaultSiteLat || c.default_site_lat || c.latitude) {
          setCustomerLatitude(String(c.defaultSiteLat || c.default_site_lat || c.latitude));
        }
        if (c.defaultSiteLng || c.default_site_lng || c.longitude) {
          setCustomerLongitude(String(c.defaultSiteLng || c.default_site_lng || c.longitude));
        }
      }
    } catch (e) {
      console.error('Error fetching sites during customer select:', e);
      setSelectedSiteId('');
    }
  };

  const handleSelectSite = (site: CustomerSite) => {
    const s = site as any;
    setSelectedSiteId(s.id);
    setCustomerAddress(s.address || '');
    setCustomerLatitude(s.latitude ? String(s.latitude) : '');
    setCustomerLongitude(s.longitude ? String(s.longitude) : '');
    if (s.mapUrl || s.map_url) {
      setMapUrl(s.mapUrl || s.map_url);
    } else if (s.latitude && s.longitude) {
      setMapUrl(`https://www.google.com/maps?q=${s.latitude},${s.longitude}`);
    }
    if (s.coordinatorName || s.coordinator_name) setSiteCoordinatorName(s.coordinatorName || s.coordinator_name);
    if (s.coordinatorPhone || s.coordinator_phone) setSiteCoordinatorPhone(s.coordinatorPhone || s.coordinator_phone);
    if (s.coordinatorLineId || s.coordinator_line_id) setSiteCoordinatorLineId(s.coordinatorLineId || s.coordinator_line_id);
  };

  const [jobType, setJobType] = useState('Renovate Service');
  const [status, setStatus] = useState('New');
  const [selectedZone, setSelectedZone] = useState<string>('[BKK] กรุงเทพฯ & ปริมณฑล');
  const [branch, setBranch] = useState(() => {
    if (branches && branches.length > 0) {
      const bkkBranch = branches.find(b => b.zone === '[BKK] กรุงเทพฯ & ปริมณฑล');
      return bkkBranch ? bkkBranch.name : branches[0].name;
    }
    return 'สาขาบางนา';
  });
  const [buildingType, setBuildingType] = useState('บ้านเดี่ยว');
  const [customBuildingType, setCustomBuildingType] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [initialBudget, setInitialBudget] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('โอนเข้าบัญชีธนาคาร');
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [leadRoomDetails, setLeadRoomDetails] = useState<LeadRoomDetail[]>([]);
  const [requiredWorkTypes, setRequiredWorkTypes] = useState<string[]>([]);
  const [customRequiredWorkType, setCustomRequiredWorkType] = useState('');
  const [notes, setNotes] = useState('');
  const [activeActionMenuLeadId, setActiveActionMenuLeadId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeActionMenuLeadId) {
        const target = e.target as HTMLElement;
        if (!target.closest('.action-menu-container')) {
          setActiveActionMenuLeadId(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeActionMenuLeadId]);

  const fetchLeads = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/leads?page=${page}&limit=20`, { headers: { 'X-User-Id': currentUser?.id || '' } });
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.pagination) {
          setLeads(result.data);
          setCurrentPage(result.pagination.page);
          setTotalPages(result.pagination.totalPages);
          setTotalLeads(result.pagination.total);
        } else {
          setLeads(result);
        }
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableSurveyors = async (dateStr: string) => {
    try {
      const response = await fetch(`/api/users/available-surveyors?date=${encodeURIComponent(dateStr)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableSurveyors(data);
        if (data.length > 0 && !surveyorId) {
          setSurveyorId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching surveyors:', err);
    }
  };

  useEffect(() => {
    if (surveyDate) {
      fetchAvailableSurveyors(surveyDate);
    }
  }, [surveyDate]);

  useEffect(() => {
    const init = async () => {
      await Promise.resolve();
      fetchLeads();
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const phoneParam = urlParams.get('phone') || urlParams.get('tel');
        if (phoneParam) {
          const clean = phoneParam.replace(/\D/g, '').slice(-10);
          if (clean) {
            setSearchTerm(clean);
          }
        }
      }
    };
    init();
  }, []);

  const fetchFollowups = async (leadId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}/followups`, { headers: { 'X-User-Id': currentUser?.id || '' } });
      if (res.ok) {
        const data = await res.json();
        setFollowupsList(data);
      }
    } catch (err) {
      console.error('Failed to fetch followups:', err);
    }
  };

  const openFollowupModal = (lead: Lead) => {
    setSelectedLeadForFollowup(lead);
    setActivityType('1.2.2 นัดลงพื้นที่ site งาน');
    const existingDate = lead.appointment_date ? lead.appointment_date.split(' ')[0] : '';
    setAppointmentDate(existingDate && !isDateInPast(existingDate) ? existingDate : getTodayDateString());
    setAppointmentTime(lead.appointment_date && lead.appointment_date.includes(' ') ? lead.appointment_date.split(' ')[1] : '10:00');
    setAssigneeName(lead.appointment_assignee || currentUser?.name || 'แอดมิน');
    setFollowupNotes('');
    setFollowupNewStatus(lead.status === 'New' ? 'Contacted' : lead.status);

    // Auto-prefill coordinator info from lead
    setSiteCoordinatorName(lead.coordinator_name || lead.customer_name || '');
    setSiteCoordinatorPhone(lead.coordinator_phone || lead.customer_phone || '');
    setSiteCoordinatorLineId(lead.coordinator_line_id || '');

    // Auto-prefill coordinates / map URL from lead
    let defaultMapUrl = lead.map_url || '';
    if (!defaultMapUrl && lead.customer_latitude && lead.customer_longitude) {
      defaultMapUrl = `https://www.google.com/maps?q=${lead.customer_latitude},${lead.customer_longitude}`;
    } else if (!defaultMapUrl && lead.customer_address) {
      defaultMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.customer_address)}`;
    }
    setSiteMapUrl(defaultMapUrl);

    setIsFollowupModalOpen(true);
    fetchFollowups(lead.id);
  };

  const handleResetFollowupLocationToLead = () => {
    if (!selectedLeadForFollowup) return;
    let defaultMapUrl = selectedLeadForFollowup.map_url || '';
    if (!defaultMapUrl && selectedLeadForFollowup.customer_latitude && selectedLeadForFollowup.customer_longitude) {
      defaultMapUrl = `https://www.google.com/maps?q=${selectedLeadForFollowup.customer_latitude},${selectedLeadForFollowup.customer_longitude}`;
    } else if (!defaultMapUrl && selectedLeadForFollowup.customer_address) {
      defaultMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLeadForFollowup.customer_address)}`;
    }
    setSiteMapUrl(defaultMapUrl);
    setSiteCoordinatorName(selectedLeadForFollowup.coordinator_name || selectedLeadForFollowup.customer_name || '');
    setSiteCoordinatorPhone(selectedLeadForFollowup.coordinator_phone || selectedLeadForFollowup.customer_phone || '');
    setSiteCoordinatorLineId(selectedLeadForFollowup.coordinator_line_id || '');
  };

  const handleOpenFollowupGoogleMaps = () => {
    if (!siteMapUrl || !siteMapUrl.trim()) {
      if (selectedLeadForFollowup?.customer_latitude && selectedLeadForFollowup?.customer_longitude) {
        window.open(`https://www.google.com/maps?q=${selectedLeadForFollowup.customer_latitude},${selectedLeadForFollowup.customer_longitude}`, '_blank');
        return;
      }
      if (selectedLeadForFollowup?.customer_address) {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLeadForFollowup.customer_address)}`, '_blank');
        return;
      }
      alert('กรุณาระบุพิกัดหรือลิงก์แผนที่ก่อน');
      return;
    }
    const trimmed = siteMapUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      window.open(trimmed, '_blank');
    } else {
      window.open(`https://www.google.com/maps?q=${encodeURIComponent(trimmed)}`, '_blank');
    }
  };

  const getFollowupMapEmbedUrl = (url: string) => {
    if (!url || !url.trim()) return '';
    const trimmed = url.trim();
    const coordsMatch = trimmed.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
    if (coordsMatch) {
      return `https://maps.google.com/maps?q=${coordsMatch[1]},${coordsMatch[2]}&z=16&output=embed`;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const qMatch = trimmed.match(/[?&]q=([^&]+)/);
      if (qMatch) {
        return `https://maps.google.com/maps?q=${qMatch[1]}&z=16&output=embed`;
      }
      return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=16&output=embed`;
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(trimmed)}&z=16&output=embed`;
  };

  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForFollowup) return;

    if (appointmentDate && isDateInPast(appointmentDate)) {
      alert('⚠️ ไม่สามารถบันทึกนัดหมายวันย้อนหลังได้ กรุณาเลือกวันปัจจุบันหรือวันล่วงหน้า');
      return;
    }

    try {
      const res = await fetch(`/api/leads/${selectedLeadForFollowup.id}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({
          activity_type: activityType,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          assignee_name: assigneeName,
          notes: followupNotes,
          new_status: followupNewStatus,
          site_coordinator_name: siteCoordinatorName,
          site_coordinator_phone: siteCoordinatorPhone,
          site_coordinator_line_id: siteCoordinatorLineId,
          site_map_url: siteMapUrl,
          survey_date: surveyDate,
          surveyor_id: surveyorId,
          created_by: currentUser?.name || 'Admin',
        }),
      });

      if (res.ok) {
        setIsFollowupModalOpen(false);
        fetchLeads();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'เกิดข้อผิดพลาดในการบันทึกการติดตาม');
      }
    } catch (err) {
      console.error('Save followup error:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const parseDMS = (dmsStr: string): number | null => {
    const dmsRegex = /(\d+)[°\s]+(\d+)[′'\s]+(\d+(?:\.\d+)?)["″\s]*([NSEWnsew])?/;
    const match = dmsStr.match(dmsRegex);
    if (!match) return null;

    const deg = parseFloat(match[1]);
    const min = parseFloat(match[2]);
    const sec = parseFloat(match[3]);
    const dir = match[4] ? match[4].toUpperCase() : 'N';

    let dd = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') {
      dd = -dd;
    }
    return parseFloat(dd.toFixed(6));
  };

  // Smart Auto-Parse Google Maps URL or Coordinates Input (supports DMS e.g. 13°51'08.1"N 100°38'36.5"E, decimal degrees e.g. 13.851979, 100.643406, or Google Maps URL)
  const parseAndApplySmartInput = (input: string) => {
    if (!input || !input.trim()) return false;
    const trimmed = decodeURIComponent(input.trim());

    // 1. Check DMS format e.g. 13°51'08.1"N 100°38'36.5"E (as in Google Maps Search Box)
    const dmsLatMatch = trimmed.match(/\d+°\d+['′]\d+(?:\.\d+)?["″]\s*[NSns]/);
    const dmsLngMatch = trimmed.match(/\d+°\d+['′]\d+(?:\.\d+)?["″]\s*[EWew]/);
    if (dmsLatMatch && dmsLngMatch) {
      const lat = parseDMS(dmsLatMatch[0]);
      const lng = parseDMS(dmsLngMatch[0]);
      if (lat !== null && lng !== null) {
        setCustomerLatitude(String(lat));
        setCustomerLongitude(String(lng));
        const generatedUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setMapUrl(generatedUrl);
        handleReverseGeocode(String(lat), String(lng));
        return true;
      }
    }

    // 2. Match standard lat, lng format e.g. "13.851979, 100.643406" or "13.851979,100.643406"
    const coordsRegex = /(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/;
    const matchCoords = trimmed.match(coordsRegex);
    if (matchCoords) {
      const lat = matchCoords[1];
      const lng = matchCoords[2];
      setCustomerLatitude(lat);
      setCustomerLongitude(lng);
      const generatedUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      setMapUrl(generatedUrl);
      handleReverseGeocode(lat, lng);
      return true;
    }

    // 3. Match Google Maps URL patterns e.g. @13.851979,100.643406 or q=13.851979,100.643406
    const urlCoordsRegex = /[@?&=](-?\d+\.\d+),(-?\d+\.\d+)/;
    const matchUrl = trimmed.match(urlCoordsRegex);
    if (matchUrl) {
      const lat = matchUrl[1];
      const lng = matchUrl[2];
      setCustomerLatitude(lat);
      setCustomerLongitude(lng);
      setMapUrl(trimmed.startsWith('http') ? trimmed : `https://www.google.com/maps?q=${lat},${lng}`);
      handleReverseGeocode(lat, lng);
      return true;
    }

    // If it's a URL but coordinates weren't directly parsed, save as mapUrl
    if (trimmed.startsWith('http')) {
      setMapUrl(trimmed);
      return true;
    }

    return false;
  };

  const handleSmartInputChange = (val: string) => {
    setSmartInput(val);
    parseAndApplySmartInput(val);
  };

  // Reverse Geocoding: Fetch address from Lat/Lng (Nominatim API)
  const handleReverseGeocode = async (latStr: string, lngStr: string) => {
    if (!latStr || !lngStr) return;
    setIsGeocodingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latStr}&lon=${lngStr}&accept-language=th`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          setCustomerAddress(data.display_name);
        }
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  // Forward Geocoding: Search Lat/Lng from Address text
  const handleSearchCoordinatesFromAddress = async () => {
    if (!customerAddress || !customerAddress.trim()) {
      alert('กรุณากรอกที่อยู่ก่อนค้นหาพิกัด');
      return;
    }
    setIsGeocodingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(customerAddress)}&accept-language=th&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat).toFixed(6);
          const lng = parseFloat(data[0].lon).toFixed(6);
          setCustomerLatitude(lat);
          setCustomerLongitude(lng);
          const generatedUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          setMapUrl(generatedUrl);
          setSmartInput(`${lat}, ${lng}`);
        } else {
          alert('ไม่พบพิกัดจากข้อความที่อยู่นี้ กรุณาระบุให้ชัดเจนยิ่งขึ้น หรือวางพิกัดจาก Google Maps');
        }
      }
    } catch (err) {
      console.error('Forward geocode error:', err);
      alert('เกิดข้อผิดพลาดในการค้นหาพิกัด');
    } finally {
      setIsGeocodingAddress(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setCustomerLatitude(lat);
        setCustomerLongitude(lng);
        setSmartInput(`${lat}, ${lng}`);
        const generatedMapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setMapUrl(generatedMapUrl);
        setIsGettingLocation(false);

        // Auto reverse geocode address into address textarea
        await handleReverseGeocode(lat, lng);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('ไม่สามารถดึงพิกัดได้ กรุณาอนุญาตการเข้าถึงสิทธิ์ตำแหน่งตำแหน่งที่ตั้ง (Location Permission)');
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocationPickedFromGIS = async (lat: string, lng: string, address?: string) => {
    if (gisTarget === 'followup') {
      const generatedUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      setSiteMapUrl(generatedUrl);
    } else {
      setCustomerLatitude(lat);
      setCustomerLongitude(lng);
      setSmartInput(`${lat}, ${lng}`);
      setMapUrl(`https://www.google.com/maps?q=${lat},${lng}`);
      if (address && address.trim()) {
        setCustomerAddress(address.trim());
      } else {
        await handleReverseGeocode(lat, lng);
      }
    }
  };

  const getGisInitialLat = () => {
    if (gisTarget === 'followup') {
      const match = siteMapUrl ? siteMapUrl.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/) : null;
      if (match) return match[1];
      if (selectedLeadForFollowup?.customer_latitude) return String(selectedLeadForFollowup.customer_latitude);
      return '';
    }
    return customerLatitude;
  };

  const getGisInitialLng = () => {
    if (gisTarget === 'followup') {
      const match = siteMapUrl ? siteMapUrl.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/) : null;
      if (match) return match[2];
      if (selectedLeadForFollowup?.customer_longitude) return String(selectedLeadForFollowup.customer_longitude);
      return '';
    }
    return customerLongitude;
  };

  const getGisInitialAddress = () => {
    if (gisTarget === 'followup') {
      return selectedLeadForFollowup?.customer_address || '';
    }
    return customerAddress;
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
    if (workAreas.includes(area)) {
      setWorkAreas(prev => prev.filter(a => a !== area));
      setLeadRoomDetails(prev => prev.filter(r => r.room_name !== area));
    } else {
      setWorkAreas(prev => [...prev, area]);
      setLeadRoomDetails(prev => [
        ...prev,
        {
          id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          room_name: area,
          room_size: '',
          work_types: [],
          custom_work_type: '',
          notes: ''
        }
      ]);
    }
  };

  const toggleRoomWorkType = (roomId: string, workTypeId: string) => {
    setLeadRoomDetails(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        const exists = r.work_types.includes(workTypeId);
        const updated = exists
          ? r.work_types.filter(w => w !== workTypeId)
          : [...r.work_types, workTypeId];
        return { ...r, work_types: updated };
      })
    );
  };

  const updateLeadRoomField = (roomId: string, field: 'room_size' | 'custom_work_type' | 'notes', value: string) => {
    setLeadRoomDetails(prev =>
      prev.map(r => (r.id === roomId ? { ...r, [field]: value } : r))
    );
  };

  const removeLeadRoom = (roomId: string, roomName: string) => {
    setLeadRoomDetails(prev => prev.filter(r => r.id !== roomId));
    setWorkAreas(prev => prev.filter(a => a !== roomName));
  };

  const toggleRequiredWorkType = (type: string) => {
    setRequiredWorkTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate phone number: must be required, digits only, max 10 digits
    const trimmedPhone = customerPhone.trim().replace(/\D/g, '');
    if (!trimmedPhone) {
      alert('กรุณากรอกเบอร์โทรติดต่อ');
      return;
    }
    if (trimmedPhone.length < 9 || trimmedPhone.length > 10) {
      alert('เบอร์โทรติดต่อต้องเป็นตัวเลขความยาว 9 - 10 หลัก (เช่น 0812345678, 021234567)');
      return;
    }
    
    const extraDetails = {
      buildingType: buildingType === 'อื่นๆ' && customBuildingType ? `อื่นๆ: ${customBuildingType}` : buildingType,
      customBuildingType,
      areaSize,
      initialBudget,
      paymentMethod,
      workAreas,
      roomDetails: leadRoomDetails,
      requiredWorkTypes: requiredWorkTypes.map(t => t === 'งานอื่นๆ' && customRequiredWorkType ? `งานอื่นๆ: ${customRequiredWorkType}` : t),
      customRequiredWorkType,
      branch
    };

    const combinedNotes = notes ? `${notes}\n\n[Details]: ${JSON.stringify(extraDetails)}` : `[Details]: ${JSON.stringify(extraDetails)}`;

    const fullCustomerName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const leadData = {
      customer_id: selectedCustomerId || null,
      customer_site_id: selectedSiteId || null,
      site_name: newSiteName || null,
      customer_name: fullCustomerName,
      customer_first_name: firstName.trim(),
      customer_last_name: lastName.trim(),
      customer_phone: trimmedPhone,
      customer_address: customerAddress,
      customer_latitude: customerLatitude ? parseFloat(customerLatitude) : null,
      customer_longitude: customerLongitude ? parseFloat(customerLongitude) : null,
      map_url: mapUrl || (customerLatitude && customerLongitude ? `https://www.google.com/maps?q=${customerLatitude},${customerLongitude}` : null),
      job_type: jobType,
      status: status,
      notes: combinedNotes,
      coordinator_name: siteCoordinatorName,
      coordinator_phone: siteCoordinatorPhone,
      coordinator_line_id: siteCoordinatorLineId,
      survey_date: surveyDate,
      surveyor_id: surveyorId,
      sales_contact_id: salesContactId,
    };

    setIsSavingLead(true);
    try {
      let response;
      if (editingLead) {
        response = await fetch(`/api/leads/${editingLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
          body: JSON.stringify(leadData),
        });
      } else {
        response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
          body: JSON.stringify(leadData),
        });
      }

      if (response.ok) {
        setIsModalOpen(false);
        fetchLeads();
      } else {
        const errJson = await response.json().catch(() => ({}));
        alert(errJson.error || 'Failed to save lead');
      }
    } catch (err: any) {
      console.error('Error saving lead', err);
      alert('Error saving lead: ' + (err.message || err));
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    const targetLead = leads.find(l => l.id === leadId);
    const targetName = targetLead ? `${targetLead.customer_name} (${targetLead.job_type})` : leadId;
    if (!confirm(`🚀 ยืนยันแปลง Lead "${targetName}" เป็นโครงการติดตั้ง (Active Project)?\n\nระบบจะดำเนินการอัตโนมัติ:\n• สร้าง Smart Project ID\n• สืบทอดพิกัด GPS Geofencing 500 เมตร & ข้อมูลติดต่อ\n• สร้างขั้นตอน Kanban และดึง Tasks แม่แบบเริ่มต้นตามประเภทงาน`)) return;
    
    try {
      const response = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({ admin_id: currentUser?.id }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const createdProjectId = data.project?.id || '';
        fetchLeads();
        if (confirm(`✅ แปลงเป็นโครงการติดตั้งสำเร็จ!\n\nรหัสโครงการ: ${createdProjectId}\nชื่อโครงการ: ${data.project?.name || ''}\nสถานะ: To Do (Active Execution)\n\nต้องการเปิดไปที่หน้ารายชื่อโครงการ (Projects) เพื่อดูงานทันทีเลยหรือไม่?`)) {
          navigate(`/projects#${createdProjectId}`);
        }
      } else {
        const data = await response.json();
        alert('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่สามารถแปลงโครงการได้'));
      }
    } catch (err) {
      console.error('Error converting lead', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const openModal = (lead: Lead | null = null) => {
    if (lead) {
      setEditingLead(lead);
      if (lead.customer_first_name !== undefined && lead.customer_first_name !== null && lead.customer_first_name !== '') {
        setFirstName(lead.customer_first_name);
        setLastName(lead.customer_last_name || '');
      } else {
        const fullName = (lead.customer_name || '').trim();
        const spaceIdx = fullName.indexOf(' ');
        if (spaceIdx !== -1) {
          setFirstName(fullName.substring(0, spaceIdx));
          setLastName(fullName.substring(spaceIdx + 1).trim());
        } else {
          setFirstName(fullName);
          setLastName('');
        }
      }
      setCustomerPhone(lead.customer_phone || '');
      setCustomerAddress(lead.customer_address || '');
      const latStr = lead.customer_latitude ? String(lead.customer_latitude) : '';
      const lngStr = lead.customer_longitude ? String(lead.customer_longitude) : '';
      setCustomerLatitude(latStr);
      setCustomerLongitude(lngStr);
      setSmartInput(latStr && lngStr ? `${latStr}, ${lngStr}` : lead.map_url || '');
      setMapUrl(lead.map_url || '');
      setJobType(lead.job_type || 'Renovate Service');
      setStatus(lead.status);
      setSiteCoordinatorName(lead.coordinator_name || '');
      setSiteCoordinatorPhone(lead.coordinator_phone || '');
      setSiteCoordinatorLineId(lead.coordinator_line_id || '');
      
      if (lead.survey_date) {
        // Format survey_date to YYYY-MM-DDThh:mm for datetime-local
        try {
          const dt = new Date(lead.survey_date);
          const formattedDt = new Date(dt.getTime() - (dt.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
          setSurveyDate(formattedDt);
        } catch {
          setSurveyDate('');
        }
      } else {
        setSurveyDate('');
      }
      setSurveyorId(lead.surveyor_id || '');
      setSalesContactId(lead.sales_contact_id || currentUser?.id || '');

      // Extract extra details if available
      try {
        if (lead.notes && lead.notes.includes('[Details]:')) {
          const parts = lead.notes.split('[Details]:');
          setNotes(parts[0].trim());
          const details = JSON.parse(parts[1].trim());
          const bType = details.buildingType || 'บ้านเดี่ยว';
          if (bType.startsWith('อื่นๆ:')) {
            setBuildingType('อื่นๆ');
            setCustomBuildingType(bType.replace('อื่นๆ:', '').trim());
          } else {
            setBuildingType(bType);
            setCustomBuildingType(details.customBuildingType || '');
          }

          setAreaSize(details.areaSize || '');
          setInitialBudget(details.initialBudget || '');
          setPaymentMethod(details.paymentMethod || 'โอนเข้าบัญชีธนาคาร');
          setWorkAreas(details.workAreas || []);
          if (Array.isArray(details.roomDetails) && details.roomDetails.length > 0) {
            setLeadRoomDetails(details.roomDetails);
          } else if (Array.isArray(details.workAreas) && details.workAreas.length > 0) {
            setLeadRoomDetails(details.workAreas.map((area: string, idx: number) => ({
              id: `room_${idx}_${Date.now()}`,
              room_name: area,
              room_size: '',
              work_types: [],
              custom_work_type: '',
              notes: ''
            })));
          } else {
            setLeadRoomDetails([]);
          }

          const reqTypes: string[] = details.requiredWorkTypes || [];
          const hasCustomOther = reqTypes.some(t => t.startsWith('งานอื่นๆ:'));
          if (hasCustomOther) {
            const customType = reqTypes.find(t => t.startsWith('งานอื่นๆ:'));
            setCustomRequiredWorkType(customType ? customType.replace('งานอื่นๆ:', '').trim() : '');
            setRequiredWorkTypes(reqTypes.map(t => t.startsWith('งานอื่นๆ:') ? 'งานอื่นๆ' : t));
          } else {
            setRequiredWorkTypes(reqTypes);
            setCustomRequiredWorkType(details.customRequiredWorkType || '');
          }

          const leadBranch = details.branch || lead.branch || (branches.length > 0 ? branches[0].name : 'สาขาบางนา');
          setBranch(leadBranch);
          const matchedBranch = branches.find(b => b.name === leadBranch || b.code === leadBranch);
          if (matchedBranch && matchedBranch.zone) {
            setSelectedZone(matchedBranch.zone);
          } else {
            setSelectedZone('[BKK] กรุงเทพฯ & ปริมณฑล');
          }
        } else {
          setNotes(lead.notes || '');
        }
      } catch {
        setNotes(lead.notes || '');
      }
      setRequireVisit(lead.status === 'Qualified' || !!lead.coordinator_name);
      
      if (lead.customer_id) {
        setSelectedCustomerId(lead.customer_id);
        fetchCustomerSites(lead.customer_id);
      } else {
        setSelectedCustomerId('');
        setCustomerSites([]);
      }
      setSelectedSiteId(lead.customer_site_id || '');
      setCustomerSearchQuery(lead.customer_name || '');
      setNewSiteName('');
    } else {
      setEditingLead(null);
      setSelectedCustomerId('');
      setCustomerSites([]);
      setSelectedSiteId('');
      setCustomerSearchQuery('');
      setNewSiteName('');
      fetchCustomersMaster();

      setFirstName('');
      setLastName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerLatitude('');
      setCustomerLongitude('');
      setMapUrl('');
      setSmartInput('');
      setJobType('Renovate Service');
      setStatus('New');
      setSelectedZone('[BKK] กรุงเทพฯ & ปริมณฑล');
      const bkkBranches = branches.filter(b => b.zone === '[BKK] กรุงเทพฯ & ปริมณฑล');
      setBranch(bkkBranches.length > 0 ? bkkBranches[0].name : (branches.length > 0 ? branches[0].name : 'สาขาบางนา'));
      setBuildingType('บ้านเดี่ยว');
      setCustomBuildingType('');
      setAreaSize('');
      setInitialBudget('');
      setPaymentMethod('โอนเข้าบัญชีธนาคาร');
      setWorkAreas([]);
      setLeadRoomDetails([]);
      setRequiredWorkTypes([]);
      setCustomRequiredWorkType('');
      setNotes('');
      setRequireVisit(false);
      setSiteCoordinatorName('');
      setSiteCoordinatorPhone('');
      setSiteCoordinatorLineId('');
      setSurveyDate('');
      setSurveyorId('');
      setSalesContactId(currentUser?.id || '');
    }
    setIsModalOpen(true);
  };

  const cleanAppointmentType = (type?: string | null): string => {
    if (!type) return 'นัดหมาย';
    return type.replace(/^\d+(\.\d+)*\s*/, '').replace(/\(.*\)/, '').trim();
  };

  const formatAppointmentDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    const parts = dateStr.trim().split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '';
    
    const dateMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateMatch) {
      const formattedDate = `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}`;
      return timePart ? `${formattedDate} • ${timePart} น.` : formattedDate;
    }
    return dateStr;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(59, 130, 246, 0.1)', 
            color: '#2563eb', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(59, 130, 246, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563eb' }} />
            ลูกค้าใหม่
          </span>
        );
      case 'Contacted':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(245, 158, 11, 0.1)', 
            color: '#d97706', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(245, 158, 11, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
            ติดตามแล้ว
          </span>
        );
      case 'Qualified':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(147, 51, 234, 0.1)', 
            color: '#9333ea', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(147, 51, 234, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#9333ea' }} />
            นัดสำรวจ / ยืนยัน
          </span>
        );
      case 'Design Review':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(2, 132, 199, 0.1)', 
            color: '#0284c7', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(2, 132, 199, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284c7' }} />
            รอตรวจแบบ 3D
          </span>
        );
      case 'Design Revision':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#dc2626', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
            ขอแก้ไขแบบ
          </span>
        );
      case 'Design Approved':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(16, 185, 129, 0.1)', 
            color: '#059669', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
            แบบอนุมัติแล้ว
          </span>
        );
      case 'Pending Quote':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(217, 119, 6, 0.1)', 
            color: '#d97706', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(217, 119, 6, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
            รอเสนอราคา
          </span>
        );
      case 'Payment Verified':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(16, 185, 129, 0.15)', 
            color: '#059669', 
            fontSize: '0.75rem', 
            fontWeight: 800,
            border: '1px solid rgba(16, 185, 129, 0.3)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
            💰 มัดจำแล้ว
          </span>
        );
      case 'Converted':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(16, 185, 129, 0.12)', 
            color: '#059669', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(16, 185, 129, 0.25)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
            เปิดโครงการแล้ว
          </span>
        );
      case 'Lost':
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            color: '#dc2626', 
            fontSize: '0.75rem', 
            fontWeight: 700,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            whiteSpace: 'nowrap'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />
            ยกเลิก
          </span>
        );
      default:
        return (
          <span style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.35rem', 
            padding: '0.2rem 0.6rem', 
            borderRadius: '9999px', 
            background: 'var(--bg-tertiary)', 
            color: 'var(--text-secondary)', 
            fontSize: '0.75rem', 
            fontWeight: 600,
            border: '1px solid var(--border-color)',
            whiteSpace: 'nowrap'
          }}>
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr?: string | Date | number | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    } catch {
      return '-';
    }
  };

  const isRecent = (dateStr?: string | Date | number | null): boolean => {
    if (!dateStr) return false;
    try {
      const created = new Date(dateStr).getTime();
      const now = new Date().getTime();
      const diffHours = (now - created) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= 24; // within 24 hours
    } catch {
      return false;
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

  const renderPrimaryActionButton = (lead: Lead) => {
    if (lead.status === 'Converted') {
      return (
        <a
          href="/projects"
          className="lead-action-btn hover-lift"
          style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#059669',
            fontWeight: 700,
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            textDecoration: 'none',
            fontSize: '0.78rem'
          }}
        >
          <CheckCircle2 size={13} /> 📁 ไปที่โครงการ
        </a>
      );
    }

    // Step 2: If site visit scheduled/approved or qualified -> Primary: บันทึกผล Visit
    if (
      lead.site_visit_approval_status === 'Approved' ||
      (lead.appointment_date && (lead.appointment_type?.includes('site') || lead.appointment_type?.includes('ลงพื้นที่'))) ||
      lead.status === 'Qualified'
    ) {
      return (
        <button
          onClick={() => {
            setSelectedLeadForVisitResult(lead);
            setIsVisitResultModalOpen(true);
          }}
          className="lead-action-btn hover-lift"
          title="บันทึกผลการเข้า Visit Site ลูกค้า / สรุปความต้องการ"
          style={{
            background: 'linear-gradient(135deg, #1e40af, #2563eb)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
            cursor: 'pointer',
            fontSize: '0.78rem'
          }}
        >
          <ClipboardCheck size={13} /> บันทึกผล Visit
        </button>
      );
    }

    // Step 3: If Pending Quote or Interested -> Primary: แบบ 2D/3D
    if (lead.status === 'Pending Quote' || lead.status === 'Interested') {
      return (
        <button
          onClick={() => {
            setSelectedLeadForDesign(lead);
            setIsDesignModalOpen(true);
          }}
          className="lead-action-btn hover-lift"
          title="จัดการแบบแปลน 2D / ภาพจำลอง 3D Perspective และตรวจรับแบบ"
          style={{
            background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 4px rgba(14, 165, 233, 0.25)',
            cursor: 'pointer',
            fontSize: '0.78rem'
          }}
        >
          <Palette size={13} /> จัดการแบบ 2D/3D
        </button>
      );
    }

    // Step 4: If Design Approved / Ready To Close -> Primary: รับมัดจำ & แปลงงาน
    if (lead.status === 'Design Approved' || lead.status === 'Ready To Close') {
      return (
        <button
          onClick={() => {
            setSelectedLeadForPayment(lead);
            setIsPaymentModalOpen(true);
          }}
          className="lead-action-btn hover-lift"
          title="บันทึกรับชำระเงินมัดจำ & แปลงเป็นโครงการติดตั้ง"
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 700,
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)',
            cursor: 'pointer',
            fontSize: '0.78rem'
          }}
        >
          <DollarSign size={13} /> รับมัดจำ & แปลงงาน
        </button>
      );
    }

    // Default (New / Contacted / Others) -> Primary: ติดตาม / นัดหมาย
    return (
      <button
        onClick={() => openFollowupModal(lead)}
        className="lead-action-btn hover-lift"
        title="บันทึกการติดตาม & นัดหมายลงพื้นที่"
        style={{
          background: 'linear-gradient(135deg, #7e22ce, #9333ea)',
          border: 'none',
          color: '#ffffff',
          fontWeight: 700,
          padding: '0.35rem 0.75rem',
          borderRadius: '6px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          boxShadow: '0 2px 4px rgba(147, 51, 234, 0.25)',
          cursor: 'pointer',
          fontSize: '0.78rem'
        }}
      >
        <Calendar size={13} /> ติดตาม / นัดหมาย
      </button>
    );
  };

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
      <style>{`
        @keyframes pulse-dot {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.9; }
        }
        .pulse-new-badge {
          animation: pulse-dot 1.5s infinite ease-in-out;
        }
        .leads-table th {
          padding: 1rem 0.75rem;
          font-weight: 700;
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid var(--border-color);
        }
        .leads-table td {
          padding: 1rem 0.75rem;
          vertical-align: top;
          border-bottom: 1px solid var(--border-color);
        }
        .customer-card-info {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .customer-name {
          font-size: 0.925rem;
          font-weight: 700;
          color: var(--text-primary);
        }
        .customer-meta-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .customer-meta-item {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
          text-decoration: none;
        }
        .gps-tag {
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #10b981;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          font-weight: 600;
          font-family: monospace;
          font-size: 0.72rem;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .gps-tag:hover {
          background: rgba(16, 185, 129, 0.15);
          transform: translateY(-1px);
        }
        .customer-address {
          font-size: 0.78rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin-top: 0.15rem;
          display: flex;
          align-items: flex-start;
          gap: 0.25rem;
        }
        .lead-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          text-decoration: none;
        }
        .lead-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.05);
        }
      `}</style>
      
      {/* ── TOP HEADER & ACTIONS ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--accent-primary)" />
            รายชื่อลูกค้ามุ่งหวัง (Leads Management)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
            จัดการข้อมูลลูกค้า บันทึกพิกัดแผนที่ (GPS) บันทึกการติดตาม/นัดหมายลงพื้นที่ และแปลงเป็นโครงการติดตั้ง
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            type="button"
            onClick={() => setIsSiteVisitModalOpen(true)}
            className="hover-lift"
            style={{
              padding: '0.65rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <ShieldCheck size={16} color="#059669" />
            อนุมัตินัดหมายออก Site
          </button>
          
          <button 
            type="button" 
            onClick={() => openModal()} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', fontWeight: 700 }}
          >
            <Plus size={18} /> + เพิ่มลูกค้าใหม่
          </button>
        </div>
      </div>

      {/* ── SUMMARY STATS BAR ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '4px solid var(--accent-primary)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LEADS ทั้งหมด</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(139, 0, 0, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} color="var(--accent-primary)" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
            {leads.length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ราย</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '4px solid #3b82f6', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ลูกค้าใหม่ (NEW)</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#3b82f6" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#3b82f6', lineHeight: 1.1 }}>
            {leads.filter(l => l.status === 'New').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ราย</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '4px solid #9333ea', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>รอสำรวจ/ยืนยัน</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(147, 51, 234, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building size={20} color="#9333ea" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#9333ea', lineHeight: 1.1 }}>
            {leads.filter(l => l.status === 'Qualified' || l.status === 'Contacted').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ราย</span>
          </div>
        </div>

        <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '4px solid #10b981', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>แปลงเป็นโครงการสำเร็จ</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
            {leads.filter(l => l.status === 'Converted').length} <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>ราย</span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, รหัส Lead (LD-...), เบอร์โทร, ที่อยู่, พิกัด..."
            style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.4rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', transition: 'border-color 0.2s' }}
          />
        </div>

        <select 
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '0.55rem 1rem 0.55rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="All">สถานะทั้งหมด</option>
          <option value="New">New (ใหม่)</option>
          <option value="Contacted">Contacted (ติดตามแล้ว)</option>
          <option value="Qualified">Qualified (รอลงสำรวจ)</option>
          <option value="Converted">Converted (เป็นโปรเจกต์แล้ว)</option>
          <option value="Lost">Lost (ยกเลิก)</option>
        </select>

        <select 
          value={jobTypeFilter}
          onChange={e => setJobTypeFilter(e.target.value)}
          style={{ padding: '0.55rem 1rem 0.55rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
        >
          <option value="All">ประเภทงานทั้งหมด</option>
          <option value="Renovate Service">Renovate Service (งานรีโนเวท)</option>
          <option value="Quick service">Quick service (งานซ่อมด่วน)</option>
          <option value="MA Service">MA Service (งานซ่อมบำรุง)</option>
        </select>
      </div>

      {/* ── LEADS TABLE ── */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'visible', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto', width: '100%', minHeight: sortedLeads.length <= 2 ? '360px' : 'auto', paddingBottom: activeActionMenuLeadId ? '120px' : '0', transition: 'padding-bottom 0.15s ease' }}>
          <table className="leads-table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ width: '155px' }}>รหัส Lead / วันที่</th>
                <th>ข้อมูลลูกค้า / การติดต่อ / พิกัด</th>
                <th style={{ width: '180px' }}>ประเภทงาน & ผู้ดูแล</th>
                <th style={{ width: '220px' }}>กำหนดนัดหมาย / สำรวจ</th>
                <th style={{ width: '160px' }}>สถานะติดตาม</th>
                <th style={{ textAlign: 'right', width: '280px' }}>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    ไม่พบข้อมูลลูกค้ามุ่งหวัง
                  </td>
                </tr>
              ) : (
                sortedLeads.map((lead, index) => {
                  const leadOwner = users.find(u => u.id === lead.sales_contact_id);
                  return (
                    <tr key={lead.id} style={{ transition: 'background var(--transition-fast)' }} className="table-row-hover">
                      {/* Column 1: Lead Ref Code & Created Date */}
                      <td>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.25rem',
                              background: 'rgba(37, 99, 235, 0.08)',
                              color: '#2563eb',
                              border: '1px solid rgba(37, 99, 235, 0.25)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 800,
                              fontFamily: 'monospace',
                              width: 'fit-content',
                              letterSpacing: '0.03em'
                            }}
                            title={`Lead Reference ID: ${lead.id}`}
                          >
                            🏷️ {formatLeadCode(lead)}
                          </span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                            {formatDateTime(lead.created_at)}
                          </span>
                          {(isRecent(lead.created_at) || index < 3) && (
                            <span 
                              className="pulse-new-badge"
                              style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.2rem',
                                background: 'linear-gradient(135deg, #ef4444, #f87171)', 
                                color: 'white', 
                                fontSize: '0.625rem', 
                                fontWeight: 800, 
                                padding: '0.125rem 0.4rem', 
                                borderRadius: '4px',
                                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                width: 'fit-content'
                              }}
                            >
                              <Sparkles size={10} /> New
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Combined Customer Info */}
                      <td>
                        <div className="customer-card-info">
                          <div className="customer-name">{lead.customer_name}</div>
                          <div className="customer-meta-row">
                            {lead.customer_phone && (
                              <a href={`tel:${lead.customer_phone}`} className="customer-meta-item hover-lift" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                                <Phone size={12} /> {lead.customer_phone}
                              </a>
                            )}
                            {lead.customer_latitude && lead.customer_longitude ? (
                              <a 
                                href={lead.map_url || `https://www.google.com/maps?q=${lead.customer_latitude},${lead.customer_longitude}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className="gps-tag"
                              >
                                <MapPin size={11} /> พิกัดหน้างาน <ExternalLink size={9} />
                              </a>
                            ) : lead.map_url ? (
                              <a 
                                href={lead.map_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="gps-tag"
                                style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#2563eb' }}
                              >
                                <MapPin size={11} /> แผนที่ Google Maps <ExternalLink size={9} />
                              </a>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                <MapPin size={11} /> ไม่ระบุพิกัด
                              </span>
                            )}
                          </div>
                          <div className="customer-address">
                            <Home size={12} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                            <span>{lead.customer_address || 'ไม่ระบุที่อยู่'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 3: Job Type & Owner */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.2rem 0.55rem', 
                            borderRadius: '6px', 
                            background: lead.job_type === 'Quick service' 
                              ? 'rgba(245, 158, 11, 0.08)' 
                              : lead.job_type === 'Renovate Service'
                              ? 'rgba(59, 130, 246, 0.08)'
                              : 'var(--bg-tertiary)', 
                            border: lead.job_type === 'Quick service' 
                              ? '1px solid rgba(245, 158, 11, 0.25)' 
                              : lead.job_type === 'Renovate Service'
                              ? '1px solid rgba(59, 130, 246, 0.25)'
                              : '1px solid var(--border-color)', 
                            fontWeight: 700, 
                            fontSize: '0.72rem',
                            color: lead.job_type === 'Quick service' 
                              ? '#d97706' 
                              : lead.job_type === 'Renovate Service'
                              ? '#2563eb'
                              : 'var(--text-secondary)',
                            width: 'fit-content'
                          }}>
                            {lead.job_type === 'Quick service' && '⚡'}
                            {lead.job_type === 'Renovate Service' && '🏢'}
                            {lead.job_type === 'MA Service' && '🔧'}
                            {lead.job_type}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            👤 {leadOwner ? leadOwner.name : 'Quick service'}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Appointment info */}
                      <td>
                        {lead.appointment_date ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Calendar size={13} color="#9333ea" />
                              <span>{formatAppointmentDateTime(lead.appointment_date)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: '#9333ea', fontWeight: 600 }}>
                                {cleanAppointmentType(lead.appointment_type)}
                              </span>
                              {lead.appointment_assignee && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  ({lead.appointment_assignee})
                                </span>
                              )}
                              {/* Micro Approval Tag */}
                              {lead.site_visit_approval_status === 'Approved' ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.05rem 0.35rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                                  <Check size={9} /> อนุมัติแล้ว
                                </span>
                              ) : lead.site_visit_approval_status === 'Rejected' ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.05rem 0.35rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                                  <X size={9} /> ไม่อนุมัติ
                                </span>
                              ) : (lead.appointment_type?.includes('site') || lead.appointment_type?.includes('ลงพื้นที่')) ? (
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#d97706', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.05rem 0.35rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                                  <Clock size={9} /> รออนุมัติ
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>- ไม่มีนัดหมาย -</span>
                        )}
                      </td>

                      {/* Column 5: Status */}
                      <td>
                        {getStatusBadge(lead.status)}
                      </td>

                      {/* Column 6: Actions */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {/* 1. Smart Contextual Primary Action Button */}
                          {renderPrimaryActionButton(lead)}

                          {/* 2. More Actions Dropdown Menu Button */}
                          <div className="action-menu-container" style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuLeadId(activeActionMenuLeadId === lead.id ? null : lead.id);
                              }}
                              className="hover-lift"
                              style={{
                                padding: '0.35rem 0.5rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color)',
                                background: activeActionMenuLeadId === lead.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              title="ตัวเลือกการดำเนินการทั้งหมด"
                            >
                              <MoreVertical size={15} />
                            </button>

                            {activeActionMenuLeadId === lead.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: index >= 2 && index >= sortedLeads.length - 2 ? 'auto' : 'calc(100% + 4px)',
                                  bottom: index >= 2 && index >= sortedLeads.length - 2 ? 'calc(100% + 4px)' : 'auto',
                                  right: 0,
                                  width: '235px',
                                  background: 'var(--bg-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '8px',
                                  boxShadow: '0 16px 36px rgba(0,0,0,0.3)',
                                  zIndex: 999,
                                  padding: '0.35rem 0',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  textAlign: 'left'
                                }}
                              >
                                <div style={{ padding: '0.35rem 0.85rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid var(--border-color)', marginBottom: '0.2rem' }}>
                                  ขั้นตอนการดำเนินงาน
                                </div>

                                {/* 1. Followup / Appointment */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuLeadId(null);
                                    openFollowupModal(lead);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.85rem',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: '#9333ea',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(147, 51, 234, 0.08)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Calendar size={13} /> 1. บันทึกติดตาม & นัดหมาย
                                  </div>
                                  {lead.site_visit_approval_status === 'Approved' && !isPrivilegedUser && (
                                    <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '0.1rem 0.35rem', borderRadius: '4px', fontWeight: 700 }}>
                                      🔒 GM Approve
                                    </span>
                                  )}
                                </button>

                                {/* 2. Site Visit Result */}
                                {lead.status === 'Converted' && !isPrivilegedUser ? (
                                  <button
                                    type="button"
                                    disabled
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.85rem',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'left',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: 'var(--text-muted)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'not-allowed',
                                      opacity: 0.6
                                    }}
                                    title="โครงการนี้เปิดเป็นงานติดตั้งแล้ว ผลสำรวจถูกล็อก (สิทธิ์แก้ไขเฉพาะ Admin หรือ GM)"
                                  >
                                    <ClipboardCheck size={13} /> 🔒 2. บันทึกผล Visit (แปลงงานแล้ว)
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuLeadId(null);
                                      setSelectedLeadForVisitResult(lead);
                                      setIsVisitResultModalOpen(true);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.85rem',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'left',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: '#1e40af',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'pointer',
                                      transition: 'background 0.12s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30, 64, 175, 0.08)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <ClipboardCheck size={13} /> 2. บันทึกผล Visit หน้างาน
                                  </button>
                                )}

                                {/* 3. Designs 2D / 3D */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuLeadId(null);
                                    setSelectedLeadForDesign(lead);
                                    setIsDesignModalOpen(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.85rem',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: '#0284c7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(2, 132, 199, 0.08)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <Palette size={13} /> 3. จัดการแบบแปลน 2D / 3D
                                </button>

                                {/* 4. Down Payment & Convert */}
                                {lead.status === 'Converted' && !isPrivilegedUser ? (
                                  <button
                                    type="button"
                                    disabled
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.85rem',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'left',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: 'var(--text-muted)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'not-allowed',
                                      opacity: 0.6
                                    }}
                                    title="โครงการนี้แปลงสำเร็จแล้ว (สิทธิ์แก้ไขข้อมูลการเงินเฉพาะ Admin/GM)"
                                  >
                                    <DollarSign size={13} /> 🔒 4. รับมัดจำ (เปิดโครงการแล้ว)
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuLeadId(null);
                                      setSelectedLeadForPayment(lead);
                                      setIsPaymentModalOpen(true);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.85rem',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'left',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      color: '#059669',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'pointer',
                                      transition: 'background 0.12s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <DollarSign size={13} /> 4. รับมัดจำ & แปลงงาน
                                  </button>
                                )}

                                {/* 5. Convert to Project */}
                                {lead.status !== 'Converted' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuLeadId(null);
                                      handleConvert(lead.id);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '0.45rem 0.85rem',
                                      background: 'transparent',
                                      border: 'none',
                                      textAlign: 'left',
                                      fontSize: '0.78rem',
                                      fontWeight: 700,
                                      color: '#059669',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      cursor: 'pointer',
                                      transition: 'background 0.12s'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <Sparkles size={13} /> 🚀 5. แปลงเป็นโครงการ (Convert)
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuLeadId(null);
                                    setSelectedLeadForTimeline(lead);
                                    setIsTimelineModalOpen(true);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.85rem',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(37, 99, 235, 0.08)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <History size={13} /> 🕒 ประวัติและเวลาแต่ละขั้นตอน
                                </button>

                                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.3rem 0' }} />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuLeadId(null);
                                    openModal(lead);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '0.45rem 0.85rem',
                                    background: 'transparent',
                                    border: 'none',
                                    textAlign: 'left',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    cursor: 'pointer',
                                    transition: 'background 0.12s'
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <Edit2 size={13} /> แก้ไขข้อมูล Lead
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.5rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          รวม {totalLeads} รายการ (หน้า {currentPage} / {totalPages})
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={() => fetchLeads(currentPage - 1)} 
            disabled={currentPage === 1 || isLoading}
            style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            ก่อนหน้า
          </button>
          
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Show pages around current page
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => fetchLeads(pageNum)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    background: currentPage === pageNum ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: currentPage === pageNum ? 'white' : 'var(--text-primary)',
                    border: '1px solid',
                    borderColor: currentPage === pageNum ? 'var(--accent-primary)' : 'var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            onClick={() => fetchLeads(currentPage + 1)} 
            disabled={currentPage === totalPages || isLoading || totalPages === 0}
            style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            ถัดไป
          </button>
        </div>
      </div>

      {/* ── FOLLOW-UP & APPOINTMENT MODAL (บันทึกการติดต่อ / หมายกำหนดนัดไปพบลูกค้า) ── */}
      {isFollowupModalOpen && selectedLeadForFollowup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1rem'
        }}>
          <div className="glass-panel" style={{ 
            padding: '1.75rem 2rem', 
            width: '780px', 
            maxWidth: '98%', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1.25rem', 
            maxHeight: '90vh', 
            overflowY: 'auto',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={24} /> บันทึกการติดตาม & นัดหมายลงพื้นที่ site งาน
              </h2>
              <button onClick={() => setIsFollowupModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={22} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{selectedLeadForFollowup.customer_name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📞 {selectedLeadForFollowup.customer_phone} | 📍 {selectedLeadForFollowup.customer_address || 'ไม่ระบุที่อยู่'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{selectedLeadForFollowup.job_type}</span>
              </div>
            </div>

            <form onSubmit={handleSaveFollowup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    กิจกรรมการติดตาม (Activity Type) *
                  </label>
                  <select
                    value={activityType}
                    onChange={e => {
                      const newType = e.target.value;
                      setActivityType(newType);
                      if (newType.includes('site') || newType.includes('ลงพื้นที่')) {
                        if (!siteMapUrl && selectedLeadForFollowup) {
                          let defaultMapUrl = selectedLeadForFollowup.map_url || '';
                          if (!defaultMapUrl && selectedLeadForFollowup.customer_latitude && selectedLeadForFollowup.customer_longitude) {
                            defaultMapUrl = `https://www.google.com/maps?q=${selectedLeadForFollowup.customer_latitude},${selectedLeadForFollowup.customer_longitude}`;
                          } else if (!defaultMapUrl && selectedLeadForFollowup.customer_address) {
                            defaultMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedLeadForFollowup.customer_address)}`;
                          }
                          setSiteMapUrl(defaultMapUrl);
                        }
                        if (!siteCoordinatorName && selectedLeadForFollowup) {
                          setSiteCoordinatorName(selectedLeadForFollowup.coordinator_name || selectedLeadForFollowup.customer_name || '');
                        }
                        if (!siteCoordinatorPhone && selectedLeadForFollowup) {
                          setSiteCoordinatorPhone(selectedLeadForFollowup.coordinator_phone || selectedLeadForFollowup.customer_phone || '');
                        }
                        if (!siteCoordinatorLineId && selectedLeadForFollowup) {
                          setSiteCoordinatorLineId(selectedLeadForFollowup.coordinator_line_id || '');
                        }
                      }
                    }}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    <option value="1.2.1 ให้โทรกลับ">1.2.1 ให้โทรกลับ (Call Back)</option>
                    <option value="1.2.2 นัดลงพื้นที่ site งาน">1.2.2 นัดลงพื้นที่ site งาน (Site Visit Appointment)</option>
                    <option value="1.3.1 ติดต่อได้ ยืนยัน Lead">1.3.1 ติดต่อได้ ยืนยัน Lead (Qualified)</option>
                    <option value="1.3.2 ไปพบที่ site งาน confirm เบื้องต้น">1.3.2 ไปพบที่ site งาน confirm เบื้องต้น</option>
                    <option value="บันทึกการสนทนาทั่วไป">บันทึกการสนทนาทั่วไป (Note)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    ปรับสถานะ Lead
                  </label>
                  <select
                    value={followupNewStatus}
                    onChange={e => setFollowupNewStatus(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                  >
                    <option value="Contacted">Contacted (ติดตามแล้ว)</option>
                    <option value="Qualified">Qualified (รอสำรวจ/ยืนยันแล้ว)</option>
                    <option value="New">New (ใหม่)</option>
                    <option value="Lost">Lost (ลูกค้ายกเลิก)</option>
                  </select>
                </div>
              </div>

              {/* APPOINTMENT DATE & TIME */}
              <div style={{ background: 'rgba(147, 51, 234, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(147, 51, 234, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={16} /> กำหนดนัดหมายวันเวลา & จองคิว QC
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsQcBookingModalOpen(true)}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #059669, #10b981)',
                      color: 'white',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                    }}
                    className="hover-lift"
                  >
                    <Sparkles size={13} /> 🔍 ตรวจสอบคิวว่าง & จองคิว QC (Slot Lock)
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>วันที่นัดหมาย (DD/MM/YYYY)</label>
                    <CustomDateInput 
                      value={appointmentDate}
                      min={getTodayDateString()}
                      onChange={e => {
                        const val = e.target.value;
                        if (val && isDateInPast(val)) {
                          alert('⚠️ ไม่สามารถเลือกวันนัดหมายย้อนหลังได้ กรุณาเลือกวันปัจจุบันหรือวันล่วงหน้า');
                          setAppointmentDate(getTodayDateString());
                          return;
                        }
                        setAppointmentDate(val);
                      }}
                      style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>เวลานัดหมาย / ช่วงเวลา</label>
                    <input 
                      type="text"
                      value={appointmentTime}
                      onChange={e => setAppointmentTime(e.target.value)}
                      placeholder="เช่น 10:00 หรือ 09:00 - 11:00 น."
                      style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ผู้รับผิดชอบ / ช่าง QC</label>
                    <input 
                      type="text"
                      value={assigneeName}
                      onChange={e => setAssigneeName(e.target.value)}
                      placeholder="ระบุชื่อผู้รับผิดชอบ"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* SITE COORDINATOR DETAILS (Conditional) */}
              {(activityType.includes('site') || activityType.includes('ลงพื้นที่')) && (
                <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <MapPin size={16} /> ข้อมูลผู้ประสานงานหน้างาน และ พิกัด (Site Coordinator & Location)
                    </span>
                    <button
                      type="button"
                      onClick={handleResetFollowupLocationToLead}
                      style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.3)', borderRadius: '4px', padding: '0.25rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      title="ดึงพิกัดและข้อมูลผู้ติดต่อเดิมของลูกค้ามาใส่"
                    >
                      <RefreshCw size={12} /> 🔄 คืนค่าพิกัดเดิมของลูกค้า
                    </button>
                  </div>
                  
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>ลิงก์ Google Maps / พิกัดสถานที่</label>
                      <div style={{ display: 'flex', gap: '0.35rem' }}>
                        <button
                          type="button"
                          onClick={() => { setGisTarget('followup'); setIsGisModalOpen(true); }}
                          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#ffffff', border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', boxShadow: '0 2px 4px rgba(249, 115, 22, 0.25)' }}
                        >
                          <MapPin size={12} /> 📍 ปักหมุดบนแผนที่ (GIS)
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenFollowupGoogleMaps}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.5rem', color: '#2563eb', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                          <ExternalLink size={12} /> เปิด Google Maps
                        </button>
                      </div>
                    </div>
                    <input 
                      type="text"
                      value={siteMapUrl}
                      onChange={e => setSiteMapUrl(e.target.value)}
                      placeholder="วางลิงก์ Google Maps หรือพิกัด เช่น 13.851979, 100.643406"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem', fontWeight: 600 }}
                    />
                  </div>

                  {/* LIVE EMBEDDED GOOGLE MAP PREVIEW FOR FOLLOWUP */}
                  {siteMapUrl && getFollowupMapEmbedUrl(siteMapUrl) && (
                    <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                      <iframe
                        title="Site Location Map Preview"
                        width="100%"
                        height="160"
                        style={{ border: 0, display: 'block' }}
                        loading="lazy"
                        allowFullScreen
                        src={getFollowupMapEmbedUrl(siteMapUrl)}
                      />
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ชื่อผู้ประสานงานหน้างาน</label>
                      <input 
                        type="text"
                        value={siteCoordinatorName}
                        onChange={e => setSiteCoordinatorName(e.target.value)}
                        placeholder="ชื่อผู้ประสานงาน"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>เบอร์โทรศัพท์ (หน้างาน)</label>
                      <input 
                        type="tel"
                        maxLength={10}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={siteCoordinatorPhone}
                        onChange={e => setSiteCoordinatorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="เบอร์ติดต่อ (10 หลัก)"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem', fontFamily: 'monospace' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Line ID (หน้างาน)</label>
                      <input 
                        type="text"
                        value={siteCoordinatorLineId}
                        onChange={e => setSiteCoordinatorLineId(e.target.value)}
                        placeholder="Line ID"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  รายละเอียดการคุย / บันทึกผลการติดต่อ
                </label>
                <textarea
                  rows={3}
                  value={followupNotes}
                  onChange={e => setFollowupNotes(e.target.value)}
                  placeholder="ระบุผลการโทรคุย สรุปที่ลูกค้ายืนยัน หรือสิ่งที่ช่างต้องเตรียมไปหน้างาน..."
                  style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              {/* FOLLOW-UP HISTORY TIMELINE */}
              <div style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  <History size={16} color="#9333ea" /> ประวัติการติดต่อ & นัดหมายในอดีต ({followupsList.length})
                </span>
                {followupsList.length === 0 ? (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    ยังไม่มีประวัติการบันทึกติดตามก่อนหน้านี้
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
                    {followupsList.map(item => (
                      <div key={item.id} style={{ background: 'var(--bg-tertiary)', padding: '0.5rem 0.75rem', borderRadius: '6px', borderLeft: '3px solid #9333ea', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-primary)' }}>
                          <span>{item.activity_type}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{formatToDDMMYYYY(item.created_at)} โดย {item.created_by}</span>
                        </div>
                        {item.appointment_date && (
                          <div style={{ color: '#9333ea', fontWeight: 600, marginTop: '0.15rem' }}>
                            📅 นัดหมาย: {item.appointment_date} {item.appointment_time || ''} {item.assignee_name ? `(ผู้รับผิดชอบ: ${item.assignee_name})` : ''}
                          </div>
                        )}
                        {item.notes && <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{item.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                <button
                  type="button"
                  onClick={() => setIsFollowupModalOpen(false)}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.55rem 1.5rem', borderRadius: 'var(--radius-md)', background: '#9333ea', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)' }}
                  className="hover-lift"
                >
                  บันทึกการติดตาม & นัดหมาย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RICH LEAD FORM MODAL WITH SMART MAP & GPS INTEGRATION ── */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Users size={22} color="var(--accent-primary)" />
                  {editingLead ? 'แก้ไขข้อมูลลูกค้ามุ่งหวัง' : 'บันทึกข้อมูลลูกค้าใหม่ (Lead Entry)'}
                </h2>
                {editingLead && (
                  <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.3)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace' }}>
                    🏷️ {formatLeadCode(editingLead)}
                  </span>
                )}
                {editingLead?.status === 'Converted' && (
                  <span style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800 }}>
                    🚀 แปลงเป็นโครงการติดตั้งแล้ว
                  </span>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem' }}>
                <X size={24} />
              </button>
            </div>

            {editingLead && editingLead.status === 'Converted' && !isPrivilegedUser && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700 }}>
                <ShieldAlert size={18} /> โครงการนี้ถูกแปลงเป็นงานติดตั้งจริงแล้ว ข้อมูลหลักถูกล็อกเพื่อความถูกต้องทางบัญชี (สิทธิ์แก้ไขเฉพาะ Admin หรือ GM)
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.75rem', alignItems: 'start' }}>
                
                {/* ── LEFT COLUMN: ข้อมูลทั่วไป & พิกัดแผนที่ (GPS) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* SECTION 1: ข้อมูลทั่วไปของลูกค้า & MASTER DIRECTORY */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 700, fontSize: '1rem' }}>
                        <FileText size={18} /> ข้อมูลทั่วไปของลูกค้า
                      </div>
                      {selectedCustomerId && (
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} /> เชื่อมต่อ Customer Master แล้ว
                        </span>
                      )}
                    </div>

                    {/* CUSTOMER MASTER AUTO-SUGGEST & SITE SELECTOR */}
                    <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Users size={14} color="#eab308" /> ค้นหาลูกค้าเดิมจาก Master (Auto-fill)
                        </span>
                        {selectedCustomerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId('');
                              setCustomerSites([]);
                              setSelectedSiteId('');
                              setCustomerSearchQuery('');
                            }}
                            style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
                          >
                            <X size={12} /> ล้างการเชื่อมต่อ Master
                          </button>
                        )}
                      </div>

                      {/* Search / Select Customer Input */}
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="พิมพ์ชื่อ, เบอร์โทร หรือบริษัท เพื่อดึงข้อมูลลูกค้าเดิม..."
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setIsCustomerDropdownOpen(true);
                            }}
                            onFocus={() => {
                              fetchCustomersMaster();
                              setIsCustomerDropdownOpen(true);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.75rem 0.45rem 2rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-secondary)',
                              fontSize: '0.82rem',
                              color: 'var(--text-primary)',
                              outline: 'none'
                            }}
                          />
                          <Search size={14} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        </div>

                        {/* Customer Search Dropdown Results */}
                        {isCustomerDropdownOpen && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'var(--bg-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              marginTop: '4px',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
                              maxHeight: '220px',
                              overflowY: 'auto',
                              zIndex: 100
                            }}
                          >
                            {(() => {
                              const q = customerSearchQuery.trim().toLowerCase();
                              const filtered = customersMaster.filter((c: any) => {
                                if (!q) return true;
                                const cName = (c.customerName || c.customer_name || '').toLowerCase();
                                const fName = (c.firstName || c.first_name || '').toLowerCase();
                                const lName = (c.lastName || c.last_name || '').toLowerCase();
                                const compName = (c.companyName || c.company_name || '').toLowerCase();
                                const phone = (c.phone || '').toLowerCase();
                                const code = (c.customerCode || c.customer_code || '').toLowerCase();
                                return cName.includes(q) || fName.includes(q) || lName.includes(q) || compName.includes(q) || phone.includes(q) || code.includes(q);
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                                    {q ? `ไม่พบข้อมูลลูกค้าที่ตรงกับ "${customerSearchQuery}"` : 'ยังไม่มีข้อมูลลูกค้าใน Master'}
                                  </div>
                                );
                              }

                              return filtered.slice(0, 10).map((c: any) => {
                                const displayName = ((c.customerType === 'corporate' || c.customer_type === 'corporate') && (c.companyName || c.company_name))
                                  ? (c.companyName || c.company_name)
                                  : (c.customerName || c.customer_name || `${c.firstName || c.first_name || ''} ${c.lastName || c.last_name || ''}`.trim());
                                const displayCode = c.customerCode || c.customer_code || 'CUST';
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => handleSelectCustomerFromMaster(c)}
                                    style={{
                                      padding: '0.6rem 0.75rem',
                                      borderBottom: '1px solid var(--border-color)',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      gap: '0.5rem'
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <div>
                                      <strong style={{ color: 'var(--text-primary)' }}>
                                        {displayName}
                                      </strong>
                                      {c.phone && <span style={{ color: '#059669', marginLeft: '0.4rem', fontSize: '0.75rem', fontWeight: 600 }}>📞 {c.phone}</span>}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 700, fontFamily: 'monospace' }}>
                                      {displayCode}
                                    </span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>

                      {/* SITE SELECTION (IF CUSTOMER HAS SITES) */}
                      {selectedCustomerId && customerSites.length > 0 && (
                        <div style={{ marginTop: '0.35rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.65rem', borderRadius: '8px', border: '1.5px solid #10b981' }}>
                          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#065f46', marginBottom: '0.25rem' }}>
                            🏢 เลือกสถานที่ติดตั้ง / ไซต์งานของลูกค้ารายนี้ ({customerSites.length} แห่ง):
                          </label>
                          <select
                            value={selectedSiteId}
                            onChange={(e) => {
                              const siteId = e.target.value;
                              if (siteId === '__new__') {
                                setSelectedSiteId('');
                                setCustomerAddress('');
                                setCustomerLatitude('');
                                setCustomerLongitude('');
                                setMapUrl('');
                              } else {
                                const found = customerSites.find(s => s.id === siteId);
                                if (found) handleSelectSite(found);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '0.45rem 0.65rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              fontSize: '0.82rem',
                              fontWeight: 600,
                              outline: 'none'
                            }}
                          >
                            {customerSites.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.isDefault ? '★ [ไซต์หลัก] ' : '📍 '}{s.siteName} {s.address ? `- ${s.address.substring(0, 35)}...` : ''}
                              </option>
                            ))}
                            <option value="__new__">➕ + เพิ่มสถานที่ติดตั้ง / ไซต์งานใหม่ให้ลูกค้าคนนี้...</option>
                          </select>
                        </div>
                      )}
                    </div>


                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          ชื่อ *
                        </label>
                        <input 
                          type="text" 
                          required
                          value={firstName}
                          onChange={e => setFirstName(e.target.value)}
                          placeholder="เช่น สำราญ"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          นามสกุล
                        </label>
                        <input 
                          type="text" 
                          value={lastName}
                          onChange={e => setLastName(e.target.value)}
                          placeholder="เช่น ศักดิ์ดี"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            เบอร์โทรติดต่อ *
                          </label>
                          <span style={{ fontSize: '0.72rem', color: customerPhone.length === 10 ? '#10b981' : 'var(--text-tertiary)', fontWeight: 600 }}>
                            {customerPhone.length}/10 หลัก
                          </span>
                        </div>
                        <input 
                          type="tel" 
                          required
                          maxLength={10}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="เช่น 0932652639"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem', fontFamily: 'monospace' }}
                        />
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
                          <option value="Contacted">Contacted (ติดตามแล้ว)</option>
                          <option value="Qualified">Qualified (รอลงสำรวจ/ยืนยันแล้ว)</option>
                          <option value="Lost">Lost (ยกเลิก)</option>
                          {status === 'Converted' && <option value="Converted">Converted (แปลงเป็นงานแล้ว)</option>}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginTop: '0.75rem' }}>
                      <SearchableBranchSelect 
                        branches={branches}
                        value={branch}
                        onChange={(bName) => setBranch(bName)}
                        selectedZone={selectedZone}
                        onZoneChange={setSelectedZone}
                        showZoneSelector={true}
                      />
                    </div>
                    
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        พนักงานขาย (Deal Owner)
                      </label>
                      <select
                        value={salesContactId}
                        onChange={e => setSalesContactId(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                      >
                        <option value="">- เลือกพนักงานขาย -</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          ที่อยู่ / พิกัดสถานที่หน้างาน
                        </label>
                        <button
                          type="button"
                          onClick={handleSearchCoordinatesFromAddress}
                          disabled={isGeocodingAddress}
                          style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
                        >
                          <SearchIcon size={12} /> {isGeocodingAddress ? 'กำลังค้นหา...' : '🔍 ค้นหาพิกัดจากข้อความที่อยู่'}
                        </button>
                      </div>
                      <textarea 
                        rows={2}
                        value={customerAddress}
                        onChange={e => setCustomerAddress(e.target.value)}
                        placeholder="เช่น 206 ซอย รามอินทรา 57 แยก 8 แขวงท่าแร้ง เขตบางเขน กรุงเทพมหานคร..."
                        style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                      />
                    </div>

                    {/* SECTION: SMART MAP & GPS LOCATION PICKER */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f97316', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '1rem' }}>🗺️</span> 1. เลือกพิกัดสถานที่ติดตั้ง (GPS Coordinates) & ปักหมุด GIS:
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            disabled={isGettingLocation}
                            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669', border: '1px solid #10b981', borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Compass size={13} /> {isGettingLocation ? 'กำลังดึงพิกัด...' : '🎯 ดึงพิกัดปัจจุบัน (GPS)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setGisTarget('lead'); setIsGisModalOpen(true); }}
                            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', boxShadow: '0 2px 5px rgba(249, 115, 22, 0.35)' }}
                          >
                            <MapPin size={13} /> 📍 ปักหมุดเลือกพิกัดบนแผนที่ (ฟรี GIS)
                          </button>
                        </div>
                      </div>

                      {/* SMART AUTO-PASTE INPUT BOX */}
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px dashed #10b981', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clipboard size={14} /> วางพิกัด หรือ ลิงก์จาก Google Maps อัจฉริยะ (Smart Auto-Fill)
                          </label>
                          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.12)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            รองรับ DMS (13°51'08.1"N) & URL
                          </span>
                        </div>

                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'rgba(16, 185, 129, 0.08)', padding: '0.4rem 0.6rem', borderRadius: '4px', borderLeft: '3px solid #10b981' }}>
                          💡 <b>วิธีก๊อปปี้จาก Google Maps:</b> ก๊อปปี้ข้อความพิกัดในช่องค้นหา (เช่น <code>13°51'07.1"N 100°38'36.3"E</code> หรือ <code>13.851979, 100.643406</code>) หรือก๊อปปี้ลิงก์ URL มาวางในช่องนี้ ระบบจะถอดค่าแยกละติจูด/ลองจิจูดและดึงที่ให้อัตโนมัติ!
                        </div>

                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <input 
                            type="text"
                            value={smartInput}
                            onChange={e => handleSmartInputChange(e.target.value)}
                            onPaste={e => {
                              const pasted = e.clipboardData.getData('text');
                              if (pasted) handleSmartInputChange(pasted);
                            }}
                            placeholder="วางพิกัด เช่น 13°51'07.1&quot;N 100°38'36.3&quot;E หรือ 13.851979, 100.643406..."
                            style={{ flex: 1, padding: '0.45rem 0.65rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.825rem', fontWeight: 600 }}
                          />
                          <button
                            type="button"
                            onClick={() => parseAndApplySmartInput(smartInput)}
                            style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '4px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Sparkles size={13} /> ✨ ถอดค่าพิกัด
                          </button>
                        </div>
                      </div>

                      {/* LATITUDE / LONGITUDE MANUAL INPUTS */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.2rem' }}>
                            <MapPin size={13} /> ละติจูด (Latitude):
                          </label>
                          <input 
                            type="text" 
                            value={customerLatitude}
                            onChange={e => { 
                              const val = e.target.value;
                              if (!parseAndApplySmartInput(val)) {
                                setCustomerLatitude(val); 
                                setSmartInput(`${val}, ${customerLongitude}`); 
                              }
                            }}
                            placeholder="13.851979 หรือ 13°51'07.1&quot;N"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                          />
                          {customerLatitude && (
                            <div 
                              onClick={() => { setGisTarget('lead'); setIsGisModalOpen(true); }}
                              style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.25rem', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                            >
                              {customerLatitude} {formatToDMS(customerLatitude, true) ? `หรือ ${formatToDMS(customerLatitude, true)}` : ''}
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.2rem' }}>
                            <MapPin size={13} /> ลองจิจูด (Longitude):
                          </label>
                          <input 
                            type="text" 
                            value={customerLongitude}
                            onChange={e => { setCustomerLongitude(e.target.value); setSmartInput(`${customerLatitude}, ${e.target.value}`); }}
                            placeholder="100.643406 หรือ 100°38'36.3&quot;E"
                            style={{ width: '100%', padding: '0.45rem 0.6rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 700 }}
                          />
                          {customerLongitude && (
                            <div 
                              onClick={() => { setGisTarget('lead'); setIsGisModalOpen(true); }}
                              style={{ fontSize: '0.7rem', color: '#059669', marginTop: '0.25rem', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                            >
                              {customerLongitude} {formatToDMS(customerLongitude, false) ? `หรือ ${formatToDMS(customerLongitude, false)}` : ''}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleReverseGeocode(customerLatitude, customerLongitude)}
                          disabled={!customerLatitude || !customerLongitude || isGeocodingAddress}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.65rem', color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Home size={13} color="#10b981" /> 🏠 แปลงพิกัดนี้เป็นที่อยู่ข้อความ
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenGoogleMaps}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.35rem 0.65rem', color: '#2563eb', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                        >
                          <Navigation size={13} /> 🌐 เปิด Google Maps ตรวจสอบตำแหน่งพิกัดบ้านลูกค้า <ExternalLink size={12} />
                        </button>
                      </div>

                      {/* RESOLVED ADDRESS PREVIEW BOX */}
                      {customerAddress && (customerLatitude || customerLongitude) && (
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: '#065f46', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                          <span style={{ color: '#ef4444', fontSize: '0.9rem', flexShrink: 0 }}>📍</span>
                          <div>
                            <strong style={{ color: '#047857', display: 'block', marginBottom: '0.15rem' }}>ที่อยู่จากการแปลงพิกัด:</strong>
                            <span style={{ wordBreak: 'break-word', color: 'var(--text-primary)' }}>{customerAddress}</span>
                          </div>
                        </div>
                      )}

                      {/* COORDINATOR INFO (REQUIRED IF VISIT PLAN) */}
                      {requireVisit && (
                        <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <AlertCircle size={14} /> ข้อมูลผู้ประสานงานในพื้นที่ (บังคับกรอก)
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>ชื่อผู้ประสานงาน *</label>
                              <input type="text" value={siteCoordinatorName} onChange={e => setSiteCoordinatorName(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.8rem' }} />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>เบอร์โทรศัพท์ * (10 หลัก)</label>
                              <input 
                                type="tel" 
                                maxLength={10}
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={siteCoordinatorPhone} 
                                onChange={e => setSiteCoordinatorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                                placeholder="08xxxxxxxx"
                                style={{ width: '100%', padding: '0.4rem', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'monospace' }} 
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>LINE ID *</label>
                            <input type="text" value={siteCoordinatorLineId} onChange={e => setSiteCoordinatorLineId(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.8rem' }} />
                          </div>

                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Clock size={14} /> นัดหมายช่างประเมิน (Smart QC Dispatch)
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>วันและเวลานัดหมาย *</label>
                                <input 
                                  type="datetime-local" 
                                  value={surveyDate} 
                                  onChange={e => setSurveyDate(e.target.value)} 
                                  style={{ width: '100%', padding: '0.4rem', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.8rem' }} 
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>เลือกช่างที่คิวว่าง (QC) *</label>
                                <select 
                                  value={surveyorId}
                                  onChange={e => setSurveyorId(e.target.value)}
                                  disabled={!surveyDate}
                                  style={{ width: '100%', padding: '0.4rem', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.8rem', opacity: !surveyDate ? 0.5 : 1 }}
                                >
                                  {!surveyDate && <option value="">เลือกเวลาเพื่อดึงรายชื่อ...</option>}
                                  {surveyDate && availableSurveyors.length === 0 && <option value="">ไม่มีช่างว่างในช่วงเวลานี้</option>}
                                  {availableSurveyors.map(u => (
                                    <option key={u.id} value={u.id}>{u.name} ({u.global_role})</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* LIVE EMBEDDED GOOGLE MAP PREVIEW */}
                      {((customerLatitude && customerLongitude) || customerAddress) && (
                        <div style={{ marginTop: '0.35rem', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                          <iframe
                            title="Interactive Map Preview"
                            width="100%"
                            height="190"
                            style={{ border: 0, display: 'block' }}
                            loading="lazy"
                            allowFullScreen
                            src={
                              customerLatitude && customerLongitude
                                ? `https://maps.google.com/maps?q=${customerLatitude},${customerLongitude}&z=16&output=embed`
                                : `https://maps.google.com/maps?q=${encodeURIComponent(customerAddress)}&z=15&output=embed`
                            }
                          />
                        </div>
                      )}
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
                          <option value="Renovate Service">Renovate Service (งานรีโนเวท)</option>
                          <option value="Quick service">Quick service (งานซ่อมด่วน)</option>
                          <option value="MA Service">MA Service (งานซ่อมบำรุง)</option>
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
                        {/* CUSTOM BUILDING TYPE INPUT */}
                        {buildingType === 'อื่นๆ' && (
                          <input 
                            type="text" 
                            value={customBuildingType} 
                            onChange={e => setCustomBuildingType(e.target.value)} 
                            placeholder="ระบุสิ่งก่อสร้างอื่นๆ เช่น คลังสินค้า..." 
                            style={{ marginTop: '0.4rem', width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-primary)' }}
                          />
                        )}
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>พื้นที่งาน (Work Areas)</span>
                        {workAreas.length > 0 && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                            เลือกแล้ว {workAreas.length} ห้อง
                          </span>
                        )}
                      </div>
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

                    {/* DYNAMIC ROOM-BY-ROOM CARDS PANEL */}
                    {leadRoomDetails.length > 0 && (
                      <div style={{
                        border: '1.5px solid rgba(168, 85, 247, 0.4)',
                        borderRadius: 'var(--radius-md)',
                        padding: '0.85rem',
                        background: 'linear-gradient(180deg, rgba(168, 85, 247, 0.04), rgba(59, 130, 246, 0.04))',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>📋</span> รายละเอียดและงานที่ต้องทำแยกตามห้อง ({leadRoomDetails.length} ห้อง)
                          </span>
                          <span style={{ fontSize: '0.72rem', background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>
                            {leadRoomDetails.length} ห้อง
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {leadRoomDetails.map((room, rIdx) => (
                            <div
                              key={room.id}
                              style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-sm)',
                                display: 'flex',
                                flexDirection: 'column'
                              }}
                            >
                              {/* Room Header */}
                              <div style={{
                                padding: '0.5rem 0.75rem',
                                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.12), rgba(59, 130, 246, 0.12))',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <span style={{ fontSize: '1.1rem' }}>{getRoomNameIcon(room.room_name)}</span>
                                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    ห้องที่ {rIdx + 1}: {room.room_name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeLeadRoom(room.id, room.room_name)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ef4444',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '4px'
                                  }}
                                  title="ยกเลิกห้องนี้"
                                >
                                  ✕ ลบห้องนี้
                                </button>
                              </div>

                              {/* Room Content */}
                              <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                {/* Room Size */}
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', marginBottom: '0.25rem' }}>
                                    📐 ขนาดห้อง / พื้นที่
                                  </label>
                                  <input
                                    type="text"
                                    value={room.room_size || ''}
                                    onChange={e => updateLeadRoomField(room.id, 'room_size', e.target.value)}
                                    placeholder="เช่น 4 x 5 ม. (20 ตร.ม.) หรือ สูง 2.8 ม."
                                    style={{
                                      width: '100%',
                                      padding: '0.4rem 0.6rem',
                                      background: 'var(--bg-tertiary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      fontSize: '0.8rem',
                                      color: 'var(--text-primary)',
                                      outline: 'none'
                                    }}
                                  />
                                </div>

                                {/* Work types for this room */}
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', marginBottom: '0.35rem' }}>
                                    ⚡ งานที่ต้องทำใน {room.room_name} (คลิกเลือกการ์ดงานด้านล่าง):
                                  </label>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.35rem' }}>
                                    {RENOVATION_WORK_CARDS.map(work => {
                                      const isSelected = room.work_types.includes(work.id);
                                      return (
                                        <button
                                          key={work.id}
                                          type="button"
                                          onClick={() => toggleRoomWorkType(room.id, work.id)}
                                          style={{
                                            padding: '0.4rem 0.5rem',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            border: isSelected ? `2px solid ${work.color}` : '1px solid var(--border-color)',
                                            background: isSelected ? work.bg : 'var(--bg-tertiary)',
                                            color: isSelected ? work.color : 'var(--text-secondary)',
                                            fontWeight: isSelected ? 700 : 500,
                                            fontSize: '0.74rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            textAlign: 'left',
                                            transition: 'all 0.15s ease'
                                          }}
                                        >
                                          <span>{work.icon}</span>
                                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{work.label}</span>
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {/* Custom input if อื่นๆ is selected */}
                                  {room.work_types.includes('งานอื่นๆ') && (
                                    <div style={{ marginTop: '0.35rem' }}>
                                      <input
                                        type="text"
                                        value={room.custom_work_type || ''}
                                        onChange={e => updateLeadRoomField(room.id, 'custom_work_type', e.target.value)}
                                        placeholder="ระบุงานอื่นๆ สำหรับห้องนี้ เช่น งานติดตั้งพัดลมดูดอากาศ, งานเจาะผนัง..."
                                        style={{
                                          width: '100%',
                                          padding: '0.35rem 0.6rem',
                                          background: '#f5f3ff',
                                          border: '1.5px solid #8b5cf6',
                                          borderRadius: '6px',
                                          fontSize: '0.78rem',
                                          color: '#5b21b6',
                                          outline: 'none'
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Room Notes */}
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                                    📝 รายละเอียด / ปัญหาเฉพาะห้องนี้
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={room.notes || ''}
                                    onChange={e => updateLeadRoomField(room.id, 'notes', e.target.value)}
                                    placeholder="ระบุความต้องการเฉพาะ หรือสภาพเดิมของห้องนี้..."
                                    style={{
                                      width: '100%',
                                      padding: '0.35rem 0.6rem',
                                      background: 'var(--bg-tertiary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '6px',
                                      fontSize: '0.78rem',
                                      color: 'var(--text-primary)',
                                      outline: 'none',
                                      resize: 'vertical'
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ประเภทงานที่ต้องการ Checkboxes Panel WITH CUSTOM INPUT */}
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.75rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>ประเภทงานที่ต้องการ</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                        {[
                          'งานไฟฟ้า & แสงสว่าง', 'งานปูน & ก่อฉาบ', 'งานกระเบื้อง & ปูพื้น',
                          'งานประปา & สุขภัณฑ์', 'งานฝ้า & ทาสี', 'งานป้องกัน & กันซึม',
                          'งานประตู-หน้าต่าง & กระจก', 'งานบิวท์อิน & ตกแต่ง', 'งานออกแบบ 2D/3D',
                          'งานติดตั้ง', 'งานอื่นๆ'
                        ].map((type) => (
                          <label key={type} style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox"
                              checked={requiredWorkTypes.includes(type) || (type === 'งานอื่นๆ' && requiredWorkTypes.includes('งานอื่นๆ')) || (type === 'งานไฟฟ้า & แสงสว่าง' && requiredWorkTypes.includes('งานไฟฟ้า')) || (type === 'งานประปา & สุขภัณฑ์' && requiredWorkTypes.includes('งานประปา')) || (type === 'งานป้องกัน & กันซึม' && requiredWorkTypes.includes('งานป้องกัน')) || (type === 'งานออกแบบ 2D/3D' && requiredWorkTypes.includes('งานออกแบบ'))}
                              onChange={() => toggleRequiredWorkType(type)}
                            />
                            {type}
                          </label>
                        ))}
                      </div>
                      {/* CUSTOM REQUIRED WORK TYPE INPUT */}
                      {(requiredWorkTypes.includes('งานอื่นๆ') || requiredWorkTypes.some(t => t.startsWith('งานอื่นๆ'))) && (
                        <input 
                          type="text"
                          value={customRequiredWorkType}
                          onChange={e => setCustomRequiredWorkType(e.target.value)}
                          placeholder="ระบุประเภทงานอื่นๆ เช่น งานฉีดปลวก, งานหลังคา..."
                          style={{ marginTop: '0.4rem', width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem', color: 'var(--text-primary)' }}
                        />
                      )}
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
                  {editingLead?.status === 'Converted' && !isPrivilegedUser ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
                </button>
                {(!editingLead || editingLead.status !== 'Converted' || isPrivilegedUser) && (
                  <button
                    type="submit"
                    disabled={isSavingLead}
                    style={{
                      padding: '0.55rem 1.5rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSavingLead ? '#9ca3af' : '#10b981',
                      color: 'white',
                      border: 'none',
                      cursor: isSavingLead ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                    className="hover-lift"
                  >
                    {isSavingLead ? <><RefreshCw size={14} className="spin-slow" /> กำลังบันทึก...</> : 'บันทึกข้อมูลลูกค้า'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIS MAP PICKER MODAL (FREE OPENSTREETMAP GIS) */}
      <GisMapPickerModal
        isOpen={isGisModalOpen}
        onClose={() => setIsGisModalOpen(false)}
        initialLat={getGisInitialLat()}
        initialLng={getGisInitialLng()}
        initialAddress={getGisInitialAddress()}
        onSelectLocation={handleLocationPickedFromGIS}
      />

      {/* SITE VISIT APPROVALS & SALES ASSIGNMENT MODAL */}
      {isSiteVisitModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '1.25rem'
        }}>
          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            width: '1100px',
            maxWidth: '96vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)'
          }}>
            {/* MODAL HEADER */}
            <div style={{
              padding: '1.15rem 1.5rem',
              borderBottom: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{ background: '#ea580c', color: 'white', padding: '0.45rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    อนุมัตินัดหมายออกพบลูกค้าภายนอก & มอบหมาย Sales (Branch Site Visit Approvals)
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    GM สาขา ตรวจสอบรายการนัดพบที่หน้างาน มอบหมายพนักงานขาย และอนุมัติการออกปฏิบัติงาน
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => { setIsSiteVisitModalOpen(false); fetchLeads(currentPage); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1 }}>
              <SiteVisitApprovalManager
                currentUser={currentUser}
                users={users}
                branches={branches}
                onRefreshParent={() => fetchLeads(currentPage)}
              />
            </div>
          </div>
        </div>
      )}

      {/* SITE VISIT RESULT RECORDING MODAL */}
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
          fetchLeads(currentPage);
        }}
      />

      {/* PHASE 02: 2D/3D DESIGN APPROVAL MODAL */}
      <DesignApprovalModal
        isOpen={isDesignModalOpen}
        onClose={() => {
          setIsDesignModalOpen(false);
          setSelectedLeadForDesign(null);
        }}
        lead={selectedLeadForDesign}
        currentUser={currentUser}
        users={users}
        onSaved={() => {
          fetchLeads(currentPage);
        }}
      />

      {/* PHASE 02: DOWN PAYMENT & PROJECT CONVERT MODAL */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedLeadForPayment(null);
        }}
        lead={selectedLeadForPayment}
        currentUser={currentUser}
        onSaved={() => {
          fetchLeads(currentPage);
        }}
        onConvertToProject={(leadId) => {
          handleConvert(leadId);
        }}
      />

      {/* LEAD LIFECYCLE TIMELINE & AUDIT TRAIL MODAL */}
      <LeadTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => {
          setIsTimelineModalOpen(false);
          setSelectedLeadForTimeline(null);
        }}
        lead={selectedLeadForTimeline}
      />

      {/* QC BOOKING & REAL-TIME SLOT LOCKING MODAL */}
      <QcBookingModal
        isOpen={isQcBookingModalOpen}
        onClose={() => setIsQcBookingModalOpen(false)}
        initialDate={appointmentDate}
        currentAssigneeName={assigneeName}
        currentTimeSlot={appointmentTime}
        leadInfo={selectedLeadForFollowup ? {
          id: selectedLeadForFollowup.id,
          customerName: selectedLeadForFollowup.customer_name,
          customerPhone: selectedLeadForFollowup.customer_phone,
          address: selectedLeadForFollowup.customer_address,
          jobType: selectedLeadForFollowup.job_type
        } : null}
        onSelectBooking={({ qcName, date, timeSlot, timeOnly }) => {
          setAppointmentDate(date);
          setAppointmentTime(timeSlot || timeOnly);
          setAssigneeName(qcName);
          setActivityType('1.2.2 นัดลงพื้นที่ site งาน');
        }}
      />

    </div>
  );
};
