import { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle2, RefreshCw, X, Search, FileText, Phone, Building, Edit2, MapPin, Navigation, ExternalLink, Compass, Map, Search as SearchIcon, Clipboard, Sparkles, Calendar, Clock, History, AlertCircle, Home } from 'lucide-react';
import type { User } from '../types';
import { formatToDDMMYYYY } from '../utils';
import { CustomDateInput } from './CustomDateInput';

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
  currentUser: User | null;
  branches?: any[];
  users?: User[];
}

export const LeadsPage = ({ currentUser, branches = [], users = [] }: LeadsPageProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Follow-up Modal & History
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [selectedLeadForFollowup, setSelectedLeadForFollowup] = useState<Lead | null>(null);
  const [followupsList, setFollowupsList] = useState<LeadFollowup[]>([]);

  // Follow-up Form states
  const [activityType, setActivityType] = useState('ให้โทรกลับ');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [assigneeName, setAssigneeName] = useState(currentUser?.name || 'แอดมิน');
  const [followupNotes, setFollowupNotes] = useState('');
  const [followupNewStatus, setFollowupNewStatus] = useState('Contacted');
  
  // Site Visit Enhanced Fields
  const [siteCoordinatorName, setSiteCoordinatorName] = useState('');
  const [siteCoordinatorPhone, setSiteCoordinatorPhone] = useState('');
  const [siteCoordinatorLineId, setSiteCoordinatorLineId] = useState('');
  const [siteMapUrl, setSiteMapUrl] = useState('');

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
  const [requireVisit, setRequireVisit] = useState(false);
  const [surveyDate, setSurveyDate] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [salesContactId, setSalesContactId] = useState(currentUser?.id || '');
  const [availableSurveyors, setAvailableSurveyors] = useState<any[]>([]);

  const [jobType, setJobType] = useState('Quick service');
  const [status, setStatus] = useState('New');
  const [branch, setBranch] = useState(() => (branches && branches.length > 0) ? branches[0].name : 'สาขาบางนา');
  const [buildingType, setBuildingType] = useState('บ้านเดี่ยว');
  const [customBuildingType, setCustomBuildingType] = useState('');
  const [areaSize, setAreaSize] = useState('');
  const [initialBudget, setInitialBudget] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('โอนเข้าบัญชีธนาคาร');
  const [workAreas, setWorkAreas] = useState<string[]>([]);
  const [requiredWorkTypes, setRequiredWorkTypes] = useState<string[]>([]);
  const [customRequiredWorkType, setCustomRequiredWorkType] = useState('');
  const [notes, setNotes] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);

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
    setActivityType('ให้โทรกลับ');
    setAppointmentDate('');
    setAppointmentTime('10:00');
    setAssigneeName(currentUser?.name || 'แอดมิน');
    setFollowupNotes('');
    setFollowupNewStatus(lead.status === 'New' ? 'Contacted' : lead.status);
    setSiteCoordinatorName('');
    setSiteCoordinatorPhone('');
    setSiteCoordinatorLineId('');
    setSiteMapUrl('');
    setIsFollowupModalOpen(true);
    fetchFollowups(lead.id);
  };

  const handleSaveFollowup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadForFollowup) return;

    // Validation for Visit Plan
    if (followupNewStatus === 'Qualified' || requireVisit) {
      if (!siteCoordinatorName || !siteCoordinatorPhone || !siteCoordinatorLineId || !customerLatitude || !customerLongitude) {
        alert('กรุณากรอกข้อมูลนัดหมายเข้าสำรวจ (Site Visit & Logistics): ชื่อผู้ประสานงาน, เบอร์โทร, LINE ID และพิกัดแผนที่ให้ครบถ้วนก่อนบันทึกสถานะนัดหมายเข้าพื้นที่');
        return;
      }
      if (!surveyDate || !surveyorId) {
        alert('กรุณาระบุวันเวลานัดหมาย และเลือกช่างประเมินหน้างาน (QC Surveyor) ก่อนบันทึกการเข้าสำรวจ');
        return;
      }
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

        // Auto reverse geocode address if address is empty
        if (!customerAddress) {
          await handleReverseGeocode(lat, lng);
        }
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
    
    // Validate phone number: must be required and digits only
    const trimmedPhone = customerPhone.trim();
    if (!trimmedPhone) {
      alert('กรุณากรอกเบอร์โทรติดต่อ');
      return;
    }
    if (!/^\d+$/.test(trimmedPhone)) {
      alert('เบอร์โทรติดต่อต้องเป็นตัวเลขทั้งหมดเท่านั้น');
      return;
    }
    
    const extraDetails = {
      buildingType: buildingType === 'อื่นๆ' && customBuildingType ? `อื่นๆ: ${customBuildingType}` : buildingType,
      customBuildingType,
      areaSize,
      initialBudget,
      paymentMethod,
      workAreas,
      requiredWorkTypes: requiredWorkTypes.map(t => t === 'งานอื่นๆ' && customRequiredWorkType ? `งานอื่นๆ: ${customRequiredWorkType}` : t),
      customRequiredWorkType,
      branch
    };

    const combinedNotes = notes ? `${notes}\n\n[Details]: ${JSON.stringify(extraDetails)}` : `[Details]: ${JSON.stringify(extraDetails)}`;

    const fullCustomerName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const leadData = {
      customer_name: fullCustomerName,
      customer_first_name: firstName.trim(),
      customer_last_name: lastName.trim(),
      customer_phone: customerPhone,
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
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
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
      setJobType(lead.job_type);
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

          setBranch(details.branch || (branches.length > 0 ? branches[0].name : 'สาขาบางนา'));
        } else {
          setNotes(lead.notes || '');
        }
      } catch {
        setNotes(lead.notes || '');
      }
      setRequireVisit(lead.status === 'Qualified' || !!lead.coordinator_name);
    } else {
      setEditingLead(null);
      setFirstName('');
      setLastName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerLatitude('');
      setCustomerLongitude('');
      setMapUrl('');
      setSmartInput('');
      setJobType('Quick service');
      setStatus('New');
      setBranch(branches.length > 0 ? branches[0].name : 'สาขาบางนา');
      setBuildingType('บ้านเดี่ยว');
      setCustomBuildingType('');
      setAreaSize('');
      setInitialBudget('');
      setPaymentMethod('โอนเข้าบัญชีธนาคาร');
      setWorkAreas([]);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'New':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700 }}>New (ใหม่)</span>;
      case 'Contacted':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontSize: '0.75rem', fontWeight: 700 }}>Contacted (ติดตามแล้ว)</span>;
      case 'Qualified':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(147, 51, 234, 0.15)', color: '#9333ea', fontSize: '0.75rem', fontWeight: 700 }}>Qualified (รอสำรวจ/ยืนยัน)</span>;
      case 'Converted':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>Converted (เป็นงานแล้ว)</span>;
      case 'Lost':
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>Lost (ยกเลิก)</span>;
      default:
        return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel hover-lift" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '4px solid var(--accent-primary)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leads ทั้งหมด</span>
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
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ลูกค้าใหม่ (New)</span>
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
            placeholder="ค้นหาชื่อลูกค้า, เบอร์โทร, ที่อยู่, พิกัด..."
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
          <option value="Quick service">Quick service (งานซ่อมด่วน)</option>
          <option value="Renovate Service">Renovate Service (งานรีโนเวท)</option>
          <option value="MA Service">MA Service (งานซ่อมบำรุง)</option>
        </select>
      </div>

      {/* ── LEADS TABLE ── */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="leads-table" style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ width: '140px' }}>วันเวลาที่เข้ามา</th>
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
                      {/* Column 1: Created Date */}
                      <td>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.825rem' }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <span style={{ 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '4px', 
                            background: lead.job_type === 'Quick service' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-tertiary)', 
                            border: lead.job_type === 'Quick service' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-color)', 
                            fontWeight: 700, 
                            fontSize: '0.72rem',
                            color: lead.job_type === 'Quick service' ? '#d97706' : 'var(--text-secondary)',
                            width: 'fit-content'
                          }}>
                            {lead.job_type}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                            👤 ผู้ดูแล: {leadOwner ? leadOwner.name : 'Quick service'}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Appointment info */}
                      <td>
                        {lead.appointment_date ? (
                          <div style={{ background: 'rgba(147, 51, 234, 0.06)', border: '1px solid rgba(147, 51, 234, 0.15)', padding: '0.4rem 0.65rem', borderRadius: '6px', display: 'inline-flex', flexDirection: 'column', gap: '0.15rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}>
                              <Calendar size={12} /> {lead.appointment_type || 'นัดหมาย'}: {lead.appointment_date}
                            </span>
                            {lead.appointment_assignee && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ผู้ลงพื้นที่: {lead.appointment_assignee}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>- ยังไม่มีนัดหมาย -</span>
                        )}
                      </td>

                      {/* Column 5: Status */}
                      <td>
                        {getStatusBadge(lead.status)}
                      </td>

                      {/* Column 6: Actions */}
                      <td style={{ textAlign: 'right' }}>
                        {lead.status !== 'Converted' ? (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => openFollowupModal(lead)}
                              className="lead-action-btn hover-lift"
                              style={{ background: 'rgba(147, 51, 234, 0.08)', border: '1px solid rgba(147, 51, 234, 0.2)', color: '#9333ea' }}
                            >
                              <Calendar size={13} /> ติดตาม / นัดหมาย
                            </button>
                            <button
                              onClick={() => openModal(lead)}
                              className="lead-action-btn hover-lift"
                              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                            >
                              <Edit2 size={13} /> แก้ไข
                            </button>
                            <button
                              onClick={() => handleConvert(lead.id)}
                              className="lead-action-btn hover-lift"
                              style={{ background: '#10b981', color: 'white', border: 'none', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)' }}
                            >
                              <RefreshCw size={13} /> แปลงเป็นงาน
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <a
                              href="/projects"
                              className="lead-action-btn hover-lift"
                              style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#059669' }}
                            >
                              <CheckCircle2 size={13} /> 📁 ไปที่โครงการติดตั้ง
                            </a>
                          </div>
                        )}
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
                    onChange={e => setActivityType(e.target.value)}
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
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={16} /> กำหนดนัดหมายวันเวลา
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>วันที่นัดหมาย</label>
                    <CustomDateInput 
                      value={appointmentDate}
                      onChange={e => setAppointmentDate(e.target.value)}
                      style={{ padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>เวลานัดหมาย</label>
                    <input 
                      type="time"
                      value={appointmentTime}
                      onChange={e => setAppointmentTime(e.target.value)}
                      style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ผู้รับผิดชอบ / ช่างที่จะไป site</label>
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
              {activityType.includes('site') && (
                <div style={{ background: 'rgba(37, 99, 235, 0.05)', padding: '0.85rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(37, 99, 235, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MapPin size={16} /> ข้อมูลผู้ประสานงานหน้างาน และ พิกัด (Site Coordinator & Location)
                  </span>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ลิงก์ Google Maps / พิกัดสถานที่</label>
                    <input 
                      type="text"
                      value={siteMapUrl}
                      onChange={e => setSiteMapUrl(e.target.value)}
                      placeholder="วางลิงก์ Google Maps หรือพิกัด เช่น 13.851979, 100.643406"
                      style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
                    />
                  </div>

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
                        type="text"
                        value={siteCoordinatorPhone}
                        onChange={e => setSiteCoordinatorPhone(e.target.value)}
                        placeholder="เบอร์ติดต่อ"
                        style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          เบอร์โทรติดต่อ *
                        </label>
                        <input 
                          type="text" 
                          required
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value.replace(/\D/g, ''))}
                          placeholder="เช่น 0932652639"
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          สาขาที่ดูแล *
                        </label>
                        <select
                          value={branch}
                          onChange={e => setBranch(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
                        >
                          {branches && branches.length > 0 ? (
                            branches.map(b => (
                              <option key={b.id || b.code} value={b.name}>
                                {b.name}
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="สาขาบางนา">สาขาบางนา</option>
                              <option value="สาขารัชดา">สาขารัชดา</option>
                              <option value="สาขาบางพลี">สาขาบางพลี</option>
                              <option value="สาขาพระราม 3">สาขาพระราม 3</option>
                              <option value="สาขาธนบุรี">สาขาธนบุรี</option>
                            </>
                          )}
                        </select>
                      </div>
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
                    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
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

                      {/* SMART AUTO-PASTE INPUT BOX */}
                      <div style={{ background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px dashed var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clipboard size={14} /> วางพิกัด หรือ ลิงก์จาก Google Maps อัจฉริยะ (Smart Auto-Fill)
                          </label>
                          <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>รองรับ DMS (13°51'08.1"N) & URL</span>
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
                            style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          >
                            <Sparkles size={13} /> ถอดค่าพิกัด
                          </button>
                        </div>
                      </div>

                      {/* LATITUDE / LONGITUDE MANUAL INPUTS */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ละติจูด (Latitude)</label>
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
                            style={{ width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>ลองจิจูด (Longitude)</label>
                          <input 
                            type="text" 
                            value={customerLongitude}
                            onChange={e => { setCustomerLongitude(e.target.value); setSmartInput(`${customerLatitude}, ${e.target.value}`); }}
                            placeholder="100.643406 หรือ 100°38'36.3&quot;E"
                            style={{ width: '100%', padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => handleReverseGeocode(customerLatitude, customerLongitude)}
                          disabled={!customerLatitude || !customerLongitude || isGeocodingAddress}
                          style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'var(--text-primary)', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                        >
                          <Map size={12} color="#10b981" /> 🏠 แปลงพิกัดนี้เป็นที่อยู่ข้อความ
                        </button>
                        <button
                          type="button"
                          onClick={handleOpenGoogleMaps}
                          style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', textDecoration: 'underline' }}
                        >
                          <Navigation size={12} /> 🗺️ เปิดค้นหาบน Google Maps
                        </button>
                      </div>

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
                              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>เบอร์โทรศัพท์ *</label>
                              <input type="text" value={siteCoordinatorPhone} onChange={e => setSiteCoordinatorPhone(e.target.value)} style={{ width: '100%', padding: '0.4rem', border: '1px solid #fca5a5', borderRadius: '4px', fontSize: '0.8rem' }} />
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
                          <option value="Quick service">Quick service (งานซ่อมด่วน)</option>
                          <option value="Renovate Service">Renovate Service (งานรีโนเวท)</option>
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

                    {/* ประเภทงานที่ต้องการ Checkboxes Panel WITH CUSTOM INPUT */}
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
                      {/* CUSTOM REQUIRED WORK TYPE INPUT */}
                      {requiredWorkTypes.includes('งานอื่นๆ') && (
                        <input 
                          type="text"
                          value={customRequiredWorkType}
                          onChange={e => setCustomRequiredWorkType(e.target.value)}
                          placeholder="ระบุประเภทงานอื่นๆ เช่น งานทาสี, งานฉีดปลวก..."
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
