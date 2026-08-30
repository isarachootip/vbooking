import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import {
  X, ClipboardCheck, Calendar, User as UserIcon,
  CheckCircle2, AlertCircle, Clock, ChevronRight, Building,
  RefreshCw, DollarSign, MessageSquare, Camera, Image,
  Upload, Trash2, ZoomIn, Eye, Sparkles, HelpCircle, ArrowUpRight,
  Layers, Plus, Wrench, Shield, Zap, Droplets, CheckSquare, Square
} from 'lucide-react';
import { formatToDDMMYYYY, getTodayDateString, isDateInPast } from '../utils';
import { CustomDateInput } from './CustomDateInput';

export interface RoomVisitPlan {
  id: string;
  room_name: string;
  room_size: string;
  improvement_systems: string[];
  custom_system?: string;
  condition_notes?: string;
  photo?: string;
  photos?: string[];
  photo_size?: number;
  photo_sizes?: number[];
}

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
  room_plans?: RoomVisitPlan[] | string;
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
    notes?: string | null;
    work_areas?: string[] | null;
    required_work_types?: string[] | null;
  } | null;
  currentUser: User | null;
  users?: User[];
  onSaved?: () => void;
}

interface PhotoSlotConfig {
  index: number;
  label: string;
  subLabel: string;
  icon: string;
  placeholderGuide: string;
  sampleImg: string;
}

const ROOM_ICONS: Record<string, string> = {
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

const getRoomIcon = (name: string): string => {
  for (const key of Object.keys(ROOM_ICONS)) {
    if (name.includes(key)) return ROOM_ICONS[key];
  }
  return '🏠';
};

const DEFAULT_ROOM_OPTIONS = [
  'ห้องรับแขก', 'ห้องครัว', 'ห้องน้ำ/ห้องส้วม',
  'ลาน/สนามหญ้า', 'ลานซักล้าง', 'ตกแต่งภายนอก',
  'ห้องนอน', 'ห้องโถง/ห้องรับแขก', 'สำนักงาน/ออฟฟิศ',
  'ลานจอดรถ'
];

const IMPROVEMENT_SYSTEMS = [
  { id: 'ระบบไฟ', label: 'ระบบไฟ & แสงสว่าง', icon: '💡', color: '#d97706', bg: '#fef3c7', border: '#fcd34d' },
  { id: 'งานปูน', label: 'งานปูน & ก่อฉาบ', icon: '🧱', color: '#b45309', bg: '#ffedd5', border: '#fed7aa' },
  { id: 'งานกระเบื้อง', label: 'งานกระเบื้อง & ปูพื้น', icon: '🔲', color: '#0d9488', bg: '#ccfbf1', border: '#99f6e4' },
  { id: 'ระบบน้ำ', label: 'ระบบน้ำ & สุขภัณฑ์', icon: '💧', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' },
  { id: 'งานฝ้าและสี', label: 'งานฝ้า & ทาสี', icon: '🎨', color: '#4f46e5', bg: '#e0e7ff', border: '#c7d2fe' },
  { id: 'ระบบป้องกัน', label: 'ระบบป้องกัน & กันซึม', icon: '🛡️', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
  { id: 'ประตูหน้าต่าง', label: 'ประตู-หน้าต่าง & กระจก', icon: '🪟', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { id: 'งานบิวท์อิน', label: 'งานบิวท์อิน & ตกแต่ง', icon: '🚪', color: '#9333ea', bg: '#fae8ff', border: '#f5d0fe' },
  { id: 'อื่นๆ', label: 'อื่นๆ (ระบุเอง)', icon: '🔧', color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
];

export const ROOM_PHOTO_GUIDES = [
  { index: 0, label: '1. มุมกว้าง 1', subLabel: 'ภาพรวมจากทางเข้า', icon: '🚪' },
  { index: 1, label: '2. มุมกว้าง 2', subLabel: 'มุมตรงข้าม / ผนังอีกด้าน', icon: '🔄' },
  { index: 2, label: '3. จุดชำรุด / แก้ไข', subLabel: 'รอยแตกร้าว / รั่ว / ปลั๊กเก่า', icon: '⚠️' },
  { index: 3, label: '4. จุดติดตั้งใหม่', subLabel: 'แนวไฟ / วางบิวท์อิน', icon: '🎯' },
  { index: 4, label: '5. การวัดระยะ', subLabel: 'ติดตลับเมตร / ระดับฝ้า', icon: '📏' }
];

const PHOTO_SLOTS: PhotoSlotConfig[] = [
  {
    index: 0,
    label: 'ช่อง 1: หน้าบ้าน & ทางเข้า',
    subLabel: 'ภายนอกอาคาร / ป้ายบ้าน / ทางเข้า',
    icon: '🏠',
    placeholderGuide: 'ถ่ายมุมกว้างเห็นตัวอาคาร ทางเข้า และป้ายบ้านชัดเจน',
    sampleImg: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=300&auto=format&fit=crop&q=60'
  },
  {
    index: 1,
    label: 'ช่อง 2: ที่จอดรถ & พื้นที่กองวัสดุ',
    subLabel: 'จุดจอดรถ / ทางลำเลียงของ',
    icon: '🚗',
    placeholderGuide: 'ถ่ายบริเวณที่จอดรถ และจุดสำหรับวางวัสดุก่อสร้าง/ทำงานช่าง',
    sampleImg: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=60'
  },
  {
    index: 2,
    label: 'ช่อง 3: ตู้ไฟหลัก (MDB / Consumer Unit)',
    subLabel: 'ตู้ไฟหลัก / เบรกเกอร์เมน',
    icon: '⚡',
    placeholderGuide: 'ถ่ายตู้ควบคุมไฟหลัก และขนาดมิเตอร์ไฟฟ้าของบ้าน',
    sampleImg: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&auto=format&fit=crop&q=60'
  },
  {
    index: 3,
    label: 'ช่อง 4: มิเตอร์น้ำ / ปั๊มน้ำ & ถังเก็บน้ำ',
    subLabel: 'ระบบประปาเมนหลัก / ปั๊มน้ำ',
    icon: '💧',
    placeholderGuide: 'ถ่ายมิเตอร์น้ำประปา ปั๊มน้ำ และท่อเมนน้ำเข้าตัวบ้าน',
    sampleImg: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&auto=format&fit=crop&q=60'
  },
  {
    index: 4,
    label: 'ช่อง 5: สภาพแวดล้อมรอบบ้าน & จุดเสี่ยง',
    subLabel: 'รอบตัวบ้าน / จุดเชื่อมต่อเพื่อนบ้าน',
    icon: '🏡',
    placeholderGuide: 'ถ่ายสภาพแวดล้อมรอบตัวบ้าน ผนังภายนอก หรือจุดเสี่ยงน้ำรั่วซึม',
    sampleImg: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&auto=format&fit=crop&q=60'
  }
];

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

// Client-side image compressor utility
const compressImageFile = (file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.75): Promise<{ base64: string; sizeKB: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const res = readerEvent.target?.result as string;
          resolve({ base64: res, sizeKB: Math.round(res.length / 1024) });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        const sizeKB = Math.round((compressedBase64.length * 3) / 4 / 1024);
        resolve({ base64: compressedBase64, sizeKB });
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const extractLeadWorkAreas = (leadObj: any): string[] => {
  if (!leadObj) return [];
  if (Array.isArray(leadObj.work_areas) && leadObj.work_areas.length > 0) {
    return leadObj.work_areas;
  }
  if (leadObj.notes && typeof leadObj.notes === 'string' && leadObj.notes.includes('[Details]:')) {
    try {
      const parts = leadObj.notes.split('[Details]:');
      const details = JSON.parse(parts[1].trim());
      if (Array.isArray(details.workAreas) && details.workAreas.length > 0) {
        return details.workAreas;
      }
    } catch (e) {
      console.error('Error parsing lead workAreas from notes:', e);
    }
  }
  return [];
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

  // Room-by-room visit plans state
  const [roomPlans, setRoomPlans] = useState<RoomVisitPlan[]>([]);
  const [newRoomNameInput, setNewRoomNameInput] = useState('');
  const [compressingRoomId, setCompressingRoomId] = useState<string | null>(null);

  // 5 Photo Slots states (Overview photos)
  const [photos, setPhotos] = useState<string[]>(['', '', '', '', '']);
  const [photoSizes, setPhotoSizes] = useState<number[]>([0, 0, 0, 0, 0]);
  const [compressingSlot, setCompressingSlot] = useState<number | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);
  const [showSampleGuide, setShowSampleGuide] = useState(false);

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
      if (r.ok) {
        const data = await r.json();
        const parsed = data.map((item: any) => {
          if (typeof item.room_plans === 'string') {
            try {
              item.room_plans = JSON.parse(item.room_plans);
            } catch {
              item.room_plans = [];
            }
          }
          return item;
        });
        setResults(parsed);
      }
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
      setPhotos(['', '', '', '', '']);
      setPhotoSizes([0, 0, 0, 0, 0]);
      setTab('new');
      setNewRoomNameInput('');

      // Auto initialize Room-by-room visit plans from Lead Work Areas and roomDetails
      let initialRoomPlans: RoomVisitPlan[] = [];
      if (lead.notes && lead.notes.includes('[Details]:')) {
        try {
          const parts = lead.notes.split('[Details]:');
          const details = JSON.parse(parts[1].trim());
          if (Array.isArray(details.roomDetails) && details.roomDetails.length > 0) {
            initialRoomPlans = details.roomDetails.map((rd: any, idx: number) => ({
              id: rd.id || `room_${idx}_${Date.now()}`,
              room_name: rd.room_name || `ห้องที่ ${idx + 1}`,
              room_size: rd.room_size || '',
              improvement_systems: rd.work_types || [],
              custom_system: rd.custom_work_type || '',
              condition_notes: rd.notes || '',
              photos: ['', '', '', '', ''],
              photo_sizes: [0, 0, 0, 0, 0]
            }));
          }
        } catch (e) {
          console.error('Error parsing roomDetails for visit plan:', e);
        }
      }

      if (initialRoomPlans.length === 0) {
        const areas = extractLeadWorkAreas(lead);
        if (areas.length > 0) {
          initialRoomPlans = areas.map((area, idx) => ({
            id: `room_${idx}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            room_name: area,
            room_size: '',
            improvement_systems: [],
            custom_system: '',
            condition_notes: '',
            photos: ['', '', '', '', ''],
            photo_sizes: [0, 0, 0, 0, 0]
          }));
        } else {
          initialRoomPlans = [
            {
              id: `room_0_${Date.now()}`,
              room_name: 'ห้องรับแขก',
              room_size: '',
              improvement_systems: [],
              custom_system: '',
              condition_notes: '',
              photos: ['', '', '', '', ''],
              photo_sizes: [0, 0, 0, 0, 0]
            }
          ];
        }
      }
      setRoomPlans(initialRoomPlans);
    }
  }, [isOpen, lead?.id]);

  const chgUser = (id: string) => {
    setUid(id);
    const u = users.find(x => x.id === id);
    setUname(u?.name || id);
  };

  const toggleRoomSystem = (roomId: string, sysId: string) => {
    setRoomPlans(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        const exists = r.improvement_systems.includes(sysId);
        const updated = exists
          ? r.improvement_systems.filter(s => s !== sysId)
          : [...r.improvement_systems, sysId];
        return { ...r, improvement_systems: updated };
      })
    );
  };

  const updateRoomPlan = (roomId: string, field: keyof RoomVisitPlan, value: any) => {
    setRoomPlans(prev =>
      prev.map(r => (r.id === roomId ? { ...r, [field]: value } : r))
    );
  };

  const handleAddRoom = (roomName: string) => {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    setRoomPlans(prev => [
      ...prev,
      {
        id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        room_name: trimmed,
        room_size: '',
        improvement_systems: [],
        custom_system: '',
        condition_notes: '',
        photo: '',
        photo_size: 0
      }
    ]);
    setNewRoomNameInput('');
  };

  const handleRemoveRoom = (roomId: string) => {
    setRoomPlans(prev => prev.filter(r => r.id !== roomId));
  };

  const handleRoomSlotPhotoUpload = async (roomId: string, slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingRoomId(`${roomId}_${slotIdx}`);
    try {
      const { base64, sizeKB } = await compressImageFile(file, 1200, 1200, 0.75);
      setRoomPlans(prev =>
        prev.map(r => {
          if (r.id !== roomId) return r;
          const photos = [...(r.photos || ['', '', '', '', ''])];
          while (photos.length < 5) photos.push('');
          photos[slotIdx] = base64;
          const photo_sizes = [...(r.photo_sizes || [0, 0, 0, 0, 0])];
          while (photo_sizes.length < 5) photo_sizes.push(0);
          photo_sizes[slotIdx] = sizeKB;
          return { ...r, photos, photo_sizes, photo: photos[0], photo_size: photo_sizes[0] };
        })
      );
      showToast(`บีบอัดรูปภาพห้องสำเร็จ (${sizeKB} KB)`, 'success');
    } catch (err) {
      console.error('Failed to compress room image:', err);
      showToast('เกิดข้อผิดพลาดในการบีบอัดรูปภาพห้อง', 'error');
    } finally {
      setCompressingRoomId(null);
      e.target.value = '';
    }
  };

  const handleRoomMultiPhotoUpload = async (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).slice(0, 5);
    setCompressingRoomId(roomId);
    showToast(`กำลังบีบอัดรูปภาพ ${fileList.length} รูป...`, 'success');

    try {
      const compressedList = await Promise.all(
        fileList.map(f => compressImageFile(f, 1200, 1200, 0.75))
      );

      setRoomPlans(prev =>
        prev.map(r => {
          if (r.id !== roomId) return r;
          const photos = [...(r.photos || ['', '', '', '', ''])];
          while (photos.length < 5) photos.push('');
          const photo_sizes = [...(r.photo_sizes || [0, 0, 0, 0, 0])];
          while (photo_sizes.length < 5) photo_sizes.push(0);

          compressedList.forEach((c, idx) => {
            photos[idx] = c.base64;
            photo_sizes[idx] = c.sizeKB;
          });

          return { ...r, photos, photo_sizes, photo: photos[0], photo_size: photo_sizes[0] };
        })
      );
      showToast(`แนบรูปภาพห้องสำเร็จ ${compressedList.length} รูป!`, 'success');
    } catch (err) {
      console.error('Error compressing multi room photos:', err);
      showToast('เกิดข้อผิดพลาดในการบีบอัดรูปภาพห้อง', 'error');
    } finally {
      setCompressingRoomId(null);
      e.target.value = '';
    }
  };

  const handleRemoveRoomSlotPhoto = (roomId: string, slotIdx: number) => {
    setRoomPlans(prev =>
      prev.map(r => {
        if (r.id !== roomId) return r;
        const photos = [...(r.photos || ['', '', '', '', ''])];
        while (photos.length < 5) photos.push('');
        photos[slotIdx] = '';
        const photo_sizes = [...(r.photo_sizes || [0, 0, 0, 0, 0])];
        while (photo_sizes.length < 5) photo_sizes.push(0);
        photo_sizes[slotIdx] = 0;
        return { ...r, photos, photo_sizes, photo: photos[0], photo_size: photo_sizes[0] };
      })
    );
  };

  const handleSlotUpload = async (slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingSlot(slotIdx);
    try {
      const { base64, sizeKB } = await compressImageFile(file, 1200, 1200, 0.75);
      setPhotos(prev => {
        const next = [...prev];
        next[slotIdx] = base64;
        return next;
      });
      setPhotoSizes(prev => {
        const next = [...prev];
        next[slotIdx] = sizeKB;
        return next;
      });
      showToast(`บีบอัดรูปที่ ${slotIdx + 1} สำเร็จ (${sizeKB} KB)`, 'success');
    } catch (err) {
      console.error('Failed to compress image:', err);
      showToast('เกิดข้อผิดพลาดในการบีบอัดรูปภาพ', 'error');
    } finally {
      setCompressingSlot(null);
      e.target.value = '';
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingSlot(999);
    try {
      const newPhotos = [...photos];
      const newSizes = [...photoSizes];

      let targetSlot = 0;
      for (let i = 0; i < files.length && i < 5; i++) {
        while (targetSlot < 5 && newPhotos[targetSlot]) {
          targetSlot++;
        }
        if (targetSlot >= 5) targetSlot = i;

        const file = files[i];
        const { base64, sizeKB } = await compressImageFile(file, 1200, 1200, 0.75);
        newPhotos[targetSlot] = base64;
        newSizes[targetSlot] = sizeKB;
        targetSlot++;
      }

      setPhotos(newPhotos);
      setPhotoSizes(newSizes);
      showToast(`บีบอัดและแนบรูปสำเร็จ ${Math.min(files.length, 5)} รูป`, 'success');
    } catch (err) {
      console.error('Bulk upload error:', err);
      showToast('ไม่สามารถบีบอัดรูปบางรูปได้', 'error');
    } finally {
      setCompressingSlot(null);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (slotIdx: number) => {
    setPhotos(prev => {
      const next = [...prev];
      next[slotIdx] = '';
      return next;
    });
    setPhotoSizes(prev => {
      const next = [...prev];
      next[slotIdx] = 0;
      return next;
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    if (nadate && isDateInPast(nadate)) {
      alert('⚠️ ไม่สามารถเลือกวันนัดหมายครั้งถัดไปย้อนหลังได้ กรุณาเลือกวันปัจจุบันหรือวันล่วงหน้า');
      return;
    }

    setSaving(true);
    try {
      const validPhotos = photos.filter(Boolean);

      let finalWscope = wscope;
      if (!finalWscope && roomPlans.length > 0) {
        finalWscope = roomPlans
          .map(r => {
            const sys = [...r.improvement_systems];
            if (sys.includes('อื่นๆ') && r.custom_system) {
              const idx = sys.indexOf('อื่นๆ');
              sys[idx] = `อื่นๆ (${r.custom_system})`;
            }
            const sysStr = sys.length > 0 ? ` [ระบบ: ${sys.join(', ')}]` : '';
            const sizeStr = r.room_size ? ` (ขนาด ${r.room_size})` : '';
            return `${r.room_name}${sizeStr}${sysStr}`;
          })
          .join(' | ');
      }

      const r = await fetch(`/api/leads/${lead.id}/visit-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({
          visited_by_id: uid || null,
          visited_by_name: uname,
          visit_date: vdate ? new Date(vdate).toISOString() : new Date().toISOString(),
          visit_result: vres,
          site_condition: scond || null,
          work_scope_summary: finalWscope || null,
          estimated_budget: budget ? parseFloat(budget) : null,
          customer_interest: cint || null,
          customer_decision: cdec,
          next_action: nact,
          next_action_date: nadate || null,
          internal_notes: inotes || null,
          photos: validPhotos,
          room_plans: roomPlans,
          created_by: currentUser?.name || 'System'
        })
      });
      if (r.ok) {
        showToast('บันทึก Visit Plan สำเร็จ!', 'success');
        await fetchR();
        setTab('history');
        onSaved?.();
      } else {
        const err = await r.json().catch(() => ({}));
        showToast(err.error || 'เกิดข้อผิดพลาดในการบันทึก', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setSaving(false);
    }
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
    borderRadius: '12px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem'
  };
  const sh: React.CSSProperties = {
    fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)',
    display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem'
  };

  const attachedGeneralCount = photos.filter(Boolean).length;
  const attachedRoomPhotoCount = roomPlans.filter(r => Boolean(r.photo)).length;
  const totalPhotosCount = attachedGeneralCount + attachedRoomPhotoCount;
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 768 : false;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: isMobile ? 'stretch' : 'flex-start',
      justifyContent: 'center',
      zIndex: 1500,
      padding: isMobile ? 0 : '1rem',
      overflowY: 'auto'
    }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 2000, background: toast.type === 'success' ? '#10b981' : '#ef4444', color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Lightbox / Zoom Image Modal */}
      {previewImageModal && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
          onClick={() => setPreviewImageModal(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: 'white', marginBottom: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{previewImageModal.title}</span>
              <button onClick={() => setPreviewImageModal(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>
            <img src={previewImageModal.url} alt={previewImageModal.title} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}

      {/* Sample Guide Modal */}
      {showSampleGuide && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowSampleGuide(false)}
        >
          <div style={{ background: 'var(--bg-primary)', borderRadius: '16px', border: '1px solid var(--border-color)', maxWidth: '720px', width: '100%', padding: '1.5rem', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                📸 ตัวอย่างภาพถ่าย 5 ช่องตามมาตรฐาน Site Visit
              </h3>
              <button onClick={() => setShowSampleGuide(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {PHOTO_SLOTS.map(slot => (
                <div key={slot.index} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {slot.icon} {slot.label}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>{slot.placeholderGuide}</p>
                  <img src={slot.sampleImg} alt={slot.label} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }} />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button onClick={() => setShowSampleGuide(false)} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                เข้าใจแล้ว ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        background: 'var(--bg-primary)',
        borderRadius: isMobile ? '0' : '16px',
        border: isMobile ? 'none' : '1px solid var(--border-color)',
        width: isMobile ? '100vw' : '840px',
        maxWidth: isMobile ? '100vw' : '96vw',
        height: isMobile ? '100dvh' : 'auto',
        maxHeight: isMobile ? '100dvh' : '90vh',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        margin: isMobile ? '0' : 'auto',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '0.75rem 1rem' : '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg,#1e40af,#7c3aed)',
          borderRadius: isMobile ? '0' : '16px 16px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.45rem', borderRadius: '8px', display: 'flex' }}>
              <ClipboardCheck size={isMobile ? 18 : 20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: isMobile ? '0.95rem' : '1.05rem', fontWeight: 800, color: 'white' }}>
                บันทึกผลสำรวจหน้างาน (Visit Record)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                {lead.customer_name} · {lead.job_type || ''}{lead.branch ? ' · ' + lead.branch : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          {([{ k: 'new' as const, l: '+ บันทึก Visit Plan ใหม่' }, { k: 'history' as const, l: `ประวัติการ Visit (${results.length})` }]).map(t => (
            <button key={t.k} type="button" onClick={() => setTab(t.k)} style={{ flex: 1, padding: '0.65rem 0.75rem', border: 'none', background: tab === t.k ? 'var(--bg-primary)' : 'transparent', color: tab === t.k ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: tab === t.k ? 700 : 500, fontSize: '0.8rem', cursor: 'pointer', borderBottom: tab === t.k ? '2px solid var(--accent-primary)' : '2px solid transparent' }}>{t.l}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: isMobile ? '0.85rem' : '1.25rem', overflowY: 'auto', flex: 1 }}>
          {tab === 'new' && (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* SECTION 1: VISIT INFO */}
              <div style={sec}>
                <div style={sh}><Calendar size={16} style={{ color: '#6366f1' }} /> ส่วนที่ 1 — ข้อมูลการ Visit</div>
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

              {/* SECTION 2: ROOM-BY-ROOM VISIT PLAN & PHOTOS */}
              {vres === 'Visited' && (
                <div style={{ ...sec, border: '1.5px solid rgba(59, 130, 246, 0.4)', background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.03), rgba(147, 51, 234, 0.03))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ ...sh, margin: 0, color: '#1d4ed8' }}>
                        <Layers size={17} style={{ color: '#2563eb' }} />
                        <span>📋 แผนงานและภาพถ่ายแยกตามห้อง / พื้นที่งาน ({roomPlans.length} ห้อง)</span>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0 0' }}>
                        สร้างหัวข้อ Visit Plan อัตโนมัติตามพื้นที่งานที่เลือกในข้อมูลลูกค้า พร้อมระบุขนาดห้อง เลือกระบบที่ต้องปรับปรุง และแนบรูปภาพเฉพาะห้อง
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 700 }}>
                        {roomPlans.length} พื้นที่งาน
                      </span>
                    </div>
                  </div>

                  {/* ROOM CARDS LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.25rem' }}>
                    {roomPlans.length === 0 && (
                      <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1.5px dashed var(--border-color)' }}>
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          ยังไม่มีการระบุห้อง/พื้นที่งาน กรุณากดเลือกเพิ่มห้องด้านล่าง:
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                          {DEFAULT_ROOM_OPTIONS.slice(0, 6).map(name => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleAddRoom(name)}
                              style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <Plus size={13} /> {getRoomIcon(name)} {name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {roomPlans.map((room, rIdx) => {
                      const hasPhoto = Boolean(room.photo);
                      const isCompressing = compressingRoomId === room.id;

                      return (
                        <div
                          key={room.id}
                          style={{
                            background: 'var(--bg-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            flexDirection: 'column'
                          }}
                        >
                          {/* Room Card Header */}
                          <div style={{
                            padding: '0.65rem 0.9rem',
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(124, 58, 237, 0.08))',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>{getRoomIcon(room.room_name)}</span>
                              <div>
                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                  ห้องที่ {rIdx + 1}: {room.room_name}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveRoom(room.id)}
                              title="ลบห้องนี้"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.25rem 0.45rem',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              <Trash2 size={13} /> ลบห้อง
                            </button>
                          </div>

                          {/* Room Card Body */}
                          <div style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {/* Section 1: Dimensions, Systems, Notes */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.85rem', alignItems: 'start' }}>
                              
                              {/* Left: Size & Notes */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {/* Room Size */}
                                <div>
                                  <label style={{ ...lbl, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <span>📐</span> ขนาดห้อง / พื้นที่ (กว้าง x ยาว หรือ ตร.ม.) *
                                  </label>
                                  <input
                                    type="text"
                                    value={room.room_size}
                                    onChange={e => updateRoomPlan(room.id, 'room_size', e.target.value)}
                                    placeholder="เช่น 4 x 5 ม. (20 ตร.ม.) หรือ สูง 2.8 ม."
                                    style={inp}
                                  />
                                </div>

                                {/* Room Notes */}
                                <div>
                                  <label style={lbl}>สภาพปัญหา / รายละเอียดที่ต้องปรับปรุงเฉพาะห้องนี้</label>
                                  <textarea
                                    value={room.condition_notes || ''}
                                    onChange={e => updateRoomPlan(room.id, 'condition_notes', e.target.value)}
                                    placeholder="ระบุสภาพเดิม จุดชำรุด หรือสิ่งที่ต้องระวังสำหรับห้องนี้..."
                                    rows={3}
                                    style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
                                  />
                                </div>
                              </div>

                              {/* Right: Improvement Systems */}
                              <div>
                                <label style={{ ...lbl, color: '#9333ea', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                  <span>⚡</span> เลือกระบบที่ต้องปรับปรุง สำหรับห้องนี้ *
                                </label>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.4rem' }}>
                                  {IMPROVEMENT_SYSTEMS.map(sys => {
                                    const isChecked = room.improvement_systems.includes(sys.id);
                                    return (
                                      <button
                                        key={sys.id}
                                        type="button"
                                        onClick={() => toggleRoomSystem(room.id, sys.id)}
                                        style={{
                                          padding: '0.4rem 0.55rem',
                                          borderRadius: '6px',
                                          cursor: 'pointer',
                                          border: isChecked ? `2px solid ${sys.color}` : '1px solid var(--border-color)',
                                          background: isChecked ? sys.bg : 'var(--bg-tertiary)',
                                          color: isChecked ? sys.color : 'var(--text-secondary)',
                                          fontWeight: isChecked ? 700 : 500,
                                          fontSize: '0.76rem',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.35rem',
                                          textAlign: 'left'
                                        }}
                                      >
                                        {isChecked ? <CheckSquare size={13} color={sys.color} /> : <Square size={13} />}
                                        <span>{sys.icon} {sys.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Custom system specification if 'อื่นๆ' checked */}
                                {room.improvement_systems.includes('อื่นๆ') && (
                                  <div style={{ marginTop: '0.4rem' }}>
                                    <input
                                      type="text"
                                      value={room.custom_system || ''}
                                      onChange={e => updateRoomPlan(room.id, 'custom_system', e.target.value)}
                                      placeholder="ระบุระบบอื่นๆ เช่น งานฝ้าเพดาน, งานทาสี, งานปูกระเบื้อง..."
                                      style={{ ...inp, border: '1.5px solid #8b5cf6', background: '#f5f3ff', color: '#5b21b6', fontSize: '0.8rem' }}
                                    />
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* Section 2: Dedicated 5 Photo Slots for THIS Room */}
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.75rem',
                              background: 'var(--bg-tertiary)',
                              borderRadius: '10px',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <Camera size={16} style={{ color: '#059669' }} />
                                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    ภาพถ่ายประจำห้อง {room.room_name} (5 มุมมาตรฐาน)
                                  </span>
                                  <span style={{ fontSize: '0.7rem', color: '#059669', background: '#d1fae5', padding: '0.1rem 0.45rem', borderRadius: '10px', fontWeight: 700 }}>
                                    แนบแล้ว {(room.photos || [room.photo || '']).filter(Boolean).length}/5 รูป
                                  </span>
                                </div>

                                <label style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  padding: '0.3rem 0.65rem',
                                  borderRadius: '6px',
                                  background: 'linear-gradient(135deg, #059669, #10b981)',
                                  color: 'white',
                                  fontSize: '0.74rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                  <Upload size={13} /> เลือกพร้อมกัน 5 รูป
                                  <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={e => handleRoomMultiPhotoUpload(room.id, e)}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              </div>

                              {/* 5 Room Photo Slots Grid */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                                {ROOM_PHOTO_GUIDES.map((guide, sIdx) => {
                                  const rPhotos = room.photos || (room.photo ? [room.photo] : []);
                                  const photoUrl = rPhotos[sIdx] || (sIdx === 0 ? room.photo : '');
                                  const rPhotoSizes = room.photo_sizes || (room.photo_size ? [room.photo_size] : []);
                                  const photoKB = rPhotoSizes[sIdx] || (sIdx === 0 ? room.photo_size : 0);
                                  const isCompressingSlot = compressingRoomId === `${room.id}_${sIdx}` || (compressingRoomId === room.id && sIdx === 0);

                                  return (
                                    <div
                                      key={sIdx}
                                      style={{
                                        border: photoUrl ? '1.5px solid #10b981' : '1px dashed var(--border-color)',
                                        borderRadius: '8px',
                                        background: 'var(--bg-primary)',
                                        padding: '0.4rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.3rem'
                                      }}
                                    >
                                      {/* Slot Label */}
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {guide.icon} {guide.label}
                                        </span>
                                        <span style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={guide.subLabel}>
                                          {guide.subLabel}
                                        </span>
                                      </div>

                                      {/* Slot Box */}
                                      <div style={{
                                        position: 'relative',
                                        height: '95px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '6px',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                      }}>
                                        {isCompressingSlot ? (
                                          <div style={{ textAlign: 'center', color: '#2563eb', fontSize: '0.68rem', fontWeight: 600, padding: '0.3rem' }}>
                                            <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 0.2rem auto' }} />
                                            บีบอัด...
                                          </div>
                                        ) : photoUrl ? (
                                          <>
                                            <img
                                              src={photoUrl}
                                              alt={`${room.room_name} - ${guide.label}`}
                                              style={{ width: '100%', height: '95px', objectFit: 'cover', cursor: 'pointer' }}
                                              onClick={() => setPreviewImageModal({ url: photoUrl, title: `${room.room_name} - ${guide.label} (${guide.subLabel})` })}
                                            />
                                            <div style={{
                                              position: 'absolute',
                                              top: '4px',
                                              right: '4px',
                                              display: 'flex',
                                              gap: '3px',
                                              background: 'rgba(0,0,0,0.65)',
                                              borderRadius: '4px',
                                              padding: '2px'
                                            }}>
                                              <button
                                                type="button"
                                                onClick={() => setPreviewImageModal({ url: photoUrl, title: `${room.room_name} - ${guide.label}` })}
                                                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '1px' }}
                                                title="ดูภาพขยาย"
                                              >
                                                <ZoomIn size={12} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveRoomSlotPhoto(room.id, sIdx)}
                                                style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '1px' }}
                                                title="ลบรูปภาพนี้"
                                              >
                                                <Trash2 size={12} />
                                              </button>
                                            </div>
                                            {photoKB ? (
                                              <div style={{
                                                position: 'absolute',
                                                bottom: '4px',
                                                left: '4px',
                                                background: 'rgba(0,0,0,0.65)',
                                                color: '#4ade80',
                                                fontSize: '0.6rem',
                                                padding: '1px 4px',
                                                borderRadius: '3px',
                                                fontWeight: 700
                                              }}>
                                                {photoKB} KB
                                              </div>
                                            ) : null}
                                          </>
                                        ) : (
                                          <label style={{
                                            width: '100%',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            padding: '0.3rem',
                                            textAlign: 'center'
                                          }}>
                                            <Camera size={18} style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }} />
                                            <span style={{ fontSize: '0.66rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                              + ถ่ายรูป
                                            </span>
                                            <input
                                              type="file"
                                              accept="image/*"
                                              onChange={e => handleRoomSlotPhotoUpload(room.id, sIdx, e)}
                                              style={{ display: 'none' }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Room Bar */}
                  <div style={{
                    marginTop: '0.4rem',
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Plus size={14} /> เพิ่มห้อง/พื้นที่งาน:
                    </span>

                    {/* Quick chips for default rooms not yet added */}
                    {DEFAULT_ROOM_OPTIONS.filter(name => !roomPlans.some(r => r.room_name === name)).slice(0, 5).map(name => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleAddRoom(name)}
                        style={{
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.73rem',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        + {getRoomIcon(name)} {name}
                      </button>
                    ))}

                    {/* Custom room input */}
                    <div style={{ display: 'flex', gap: '0.3rem', flex: 1, minWidth: '180px' }}>
                      <input
                        type="text"
                        value={newRoomNameInput}
                        onChange={e => setNewRoomNameInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRoom(newRoomNameInput);
                          }
                        }}
                        placeholder="พิมพ์ชื่อห้องอื่นๆ เช่น ห้องทำงาน, ดาดฟ้า..."
                        style={{ ...inp, padding: '0.35rem 0.6rem', fontSize: '0.78rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddRoom(newRoomNameInput)}
                        disabled={!newRoomNameInput.trim()}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '6px',
                          background: newRoomNameInput.trim() ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: newRoomNameInput.trim() ? 'white' : 'var(--text-tertiary)',
                          border: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: newRoomNameInput.trim() ? 'pointer' : 'not-allowed',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        เพิ่ม
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* SECTION 3: SITE CONDITION & WORK SCOPE SUMMARY */}
              {vres === 'Visited' && (
                <div style={sec}>
                  <div style={sh}><Building size={15} style={{ color: '#f59e0b' }} /> ส่วนที่ 3 — สภาพหน้างานรวม & งบประมาณ</div>
                  <div>
                    <label style={lbl}>สภาพบ้าน / ข้อมูลโครงสร้างโดยรวม</label>
                    <textarea value={scond} onChange={e => setScond(e.target.value)} placeholder="เช่น บ้านเดี่ยว 2 ชั้น โครงสร้างเดิมแข็งแรงดี มีจุดรั่วซึม..." rows={2} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                  </div>
                  <div>
                    <label style={lbl}>สรุปขอบเขตงานทั้งหมด (Work Scope Summary)</label>
                    <textarea value={wscope} onChange={e => setWscope(e.target.value)} placeholder="หากเว้นว่าง ระบบจะสร้างสรุปจากรายการห้องและระบบที่เลือกให้อัตโนมัติ" rows={2} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                  </div>
                  <div style={{ maxWidth: '260px' }}>
                    <label style={lbl}>งบประมาณประเมินเบื้องต้น (บาท)</label>
                    <div style={{ position: 'relative' }}>
                      <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                      <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="0" min={0} style={{ ...inp, paddingLeft: '1.75rem' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: 5 PHOTO SLOTS (OVERALL & EXTERIOR PHOTOS) */}
              {vres === 'Visited' && (
                <div style={{ ...sec, border: '1.5px solid rgba(147, 51, 234, 0.35)', background: 'linear-gradient(180deg, rgba(147, 51, 234, 0.03), rgba(37, 99, 235, 0.03))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ ...sh, margin: 0 }}>
                      <Camera size={16} style={{ color: '#9333ea' }} /> 
                      <span>📸 ส่วนที่ 4 — ภาพถ่ายภาพรวมภายนอกอาคาร & ระบบสาธารณูปโภคหลัก 5 ช่อง</span>
                      <span style={{ fontSize: '0.72rem', background: attachedGeneralCount > 0 ? '#dcfce7' : 'var(--bg-tertiary)', color: attachedGeneralCount > 0 ? '#16a34a' : 'var(--text-secondary)', padding: '0.15rem 0.5rem', borderRadius: '10px', fontWeight: 700 }}>
                        แนบแล้ว {attachedGeneralCount}/5 รูป
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setShowSampleGuide(true)}
                        style={{
                          background: 'transparent',
                          border: '1px solid rgba(147, 51, 234, 0.4)',
                          color: '#9333ea',
                          borderRadius: '6px',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Eye size={12} /> ดูตัวอย่างภาพ 5 ช่อง
                      </button>

                      <label style={{
                        background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                        color: 'white',
                        borderRadius: '6px',
                        padding: '0.25rem 0.65rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)'
                      }}>
                        <Upload size={12} /> เลือกพร้อมกัน 5 รูป
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleBulkUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '0.65rem',
                    marginTop: '0.25rem'
                  }}>
                    {PHOTO_SLOTS.map((slot) => {
                      const hasPhoto = !!photos[slot.index];
                      const photoSize = photoSizes[slot.index];
                      const isThisCompressing = compressingSlot === slot.index || compressingSlot === 999;

                      return (
                        <div
                          key={slot.index}
                          style={{
                            background: 'var(--bg-primary)',
                            border: hasPhoto ? '2px solid #22c55e' : '1.5px dashed var(--border-color)',
                            borderRadius: '10px',
                            padding: '0.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-sm)',
                            minHeight: '165px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.85rem' }}>{slot.icon}</span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              ช่อง {slot.index + 1}
                            </span>
                          </div>

                          <div style={{
                            flex: 1,
                            position: 'relative',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            background: 'var(--bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '90px'
                          }}>
                            {isThisCompressing ? (
                              <div style={{ textAlign: 'center', padding: '0.5rem', color: '#9333ea', fontSize: '0.7rem', fontWeight: 600 }}>
                                <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 0.25rem auto' }} />
                                บีบอัด...
                              </div>
                            ) : hasPhoto ? (
                              <>
                                <img
                                  src={photos[slot.index]}
                                  alt={slot.label}
                                  style={{ width: '100%', height: '90px', objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => setPreviewImageModal({ url: photos[slot.index], title: slot.label })}
                                />
                                <div style={{
                                  position: 'absolute',
                                  top: '4px',
                                  right: '4px',
                                  display: 'flex',
                                  gap: '3px',
                                  background: 'rgba(0,0,0,0.6)',
                                  borderRadius: '6px',
                                  padding: '2px'
                                }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImageModal({ url: photos[slot.index], title: slot.label })}
                                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '2px' }}
                                    title="ดูภาพขยาย"
                                  >
                                    <ZoomIn size={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(slot.index)}
                                    style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                                    title="ลบรูปนี้"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <label style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: '0.4rem',
                                textAlign: 'center'
                              }}>
                                <Camera size={20} style={{ color: 'var(--text-secondary)', marginBottom: '0.2rem' }} />
                                <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 700 }}>
                                  + ถ่าย / เลือกรูป
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSlotUpload(slot.index, e)}
                                  style={{ display: 'none' }}
                                />
                              </label>
                            )}
                          </div>

                          <div style={{ marginTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {slot.subLabel}
                            </span>
                            {hasPhoto && photoSize > 0 && (
                              <span style={{ fontSize: '0.62rem', color: '#16a34a', fontWeight: 700 }}>
                                {photoSize} KB
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 5: CUSTOMER REQUIREMENTS & FEEDBACK */}
              {vres === 'Visited' && (
                <div style={sec}>
                  <div style={sh}><MessageSquare size={15} style={{ color: '#10b981' }} /> ส่วนที่ 4 — ความต้องการลูกค้า & การตัดสินใจ</div>
                  <div>
                    <label style={lbl}>สิ่งที่ลูกค้าพูด / ความต้องการเฉพาะเจาะจง</label>
                    <textarea value={cint} onChange={e => setCint(e.target.value)} placeholder="เช่น ลูกค้าต้องการเร่งติดตั้งภายในสิ้นเดือน, เน้นโทนสีสว่าง..." rows={2} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                  </div>
                  <div>
                    <label style={lbl}>การตัดสินใจลูกค้า *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.5rem' }}>
                      {CUSTOMER_DECISION_OPTIONS.map(o => (
                        <button key={o.value} type="button" onClick={() => setCdec(o.value)} style={{ padding: '0.55rem 0.75rem', borderRadius: '8px', cursor: 'pointer', border: cdec === o.value ? `2px solid var(--accent-primary)` : '2px solid var(--border-color)', background: cdec === o.value ? 'var(--accent-bg)' : 'var(--bg-tertiary)', color: cdec === o.value ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: cdec === o.value ? 700 : 500, fontSize: '0.82rem', textAlign: 'left' }}>{o.label}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 6: NEXT ACTIONS */}
              <div style={sec}>
                <div style={sh}><ChevronRight size={15} style={{ color: '#ec4899' }} /> ส่วนที่ 5 — การดำเนินการต่อ (Next Action)</div>
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
                    <label style={lbl}>วันนัดหมายครั้งถัดไป (DD/MM/YYYY)</label>
                    <CustomDateInput 
                      value={nadate} 
                      min={getTodayDateString()}
                      onChange={e => {
                        const val = e.target.value;
                        if (val && isDateInPast(val)) {
                          alert('⚠️ ไม่สามารถเลือกวันนัดหมายย้อนหลังได้ กรุณาเลือกวันปัจจุบันหรือวันล่วงหน้า');
                          setNadate(getTodayDateString());
                          return;
                        }
                        setNadate(val);
                      }} 
                      style={inp} 
                    />
                  </div>
                )}
                <div>
                  <label style={lbl}>หมายเหตุภายใน (PM/SA/Admin)</label>
                  <textarea value={inotes} onChange={e => setInotes(e.target.value)} placeholder="บันทึกข้อสังเกต หรือข้อมูลลับเฉพาะทีมงาน" rows={2} style={{ ...inp, resize: 'vertical' } as React.CSSProperties} />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '0.6rem 1.5rem',
                    borderRadius: '8px',
                    background: saving ? '#9ca3af' : 'linear-gradient(135deg,#1e40af,#7c3aed)',
                    border: 'none',
                    color: 'white',
                    fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: saving ? 'none' : '0 4px 14px rgba(99,102,241,0.4)'
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : (
                    <>
                      <ClipboardCheck size={15} />
                      บันทึก Visit Plan ({roomPlans.length} ห้อง · รวม {totalPhotosCount} รูป)
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: HISTORY */}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ประวัติการ Visit ทั้งหมด ({results.length} ครั้ง)</span>
                <button type="button" onClick={fetchR} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}><RefreshCw size={13} /> รีเฟรช</button>
              </div>

              {loading && <div style={{ textAlign: 'center', padding: '2rem' }}>กำลังโหลดประวัติ...</div>}
              
              {!loading && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)', border: '2px dashed var(--border-color)', borderRadius: '10px' }}>
                  <ClipboardCheck size={36} style={{ opacity: 0.4 }} />
                  <p>ยังไม่มีประวัติการ Visit Site</p>
                  <button type="button" onClick={() => setTab('new')} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.45rem 1rem', fontWeight: 600, cursor: 'pointer' }}>+ บันทึกผล Visit ครั้งแรก</button>
                </div>
              )}

              {!loading && results.map(r => {
                const ro = VISIT_RESULT_OPTIONS.find(o => o.value === r.visit_result);
                const dc = CUSTOMER_DECISION_OPTIONS.find(o => o.value === r.customer_decision);
                const na2 = NEXT_ACTION_OPTIONS.find(o => o.value === r.next_action);
                const pastRoomPlans: RoomVisitPlan[] = Array.isArray(r.room_plans) ? r.room_plans : [];

                return (
                  <div key={r.id} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderLeft: `4px solid ${ro?.color || '#6b7280'}`, borderRadius: '12px', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, color: ro?.color || 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {ro?.label || r.visit_result}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'flex', gap: '0.75rem' }}>
                        <span>Visit: {fmtDate(r.visit_date)}</span>
                        <span>โดย: {r.visited_by_name_ref || r.visited_by_name || '-'}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                      {r.site_condition && <div style={{ gridColumn: '1/-1' }}><b style={{ color: 'var(--text-tertiary)' }}>สภาพบ้าน/พื้นที่รวม: </b>{r.site_condition}</div>}
                      {r.work_scope_summary && <div style={{ gridColumn: '1/-1' }}><b style={{ color: 'var(--text-tertiary)' }}>สรุปขอบเขตงาน: </b>{r.work_scope_summary}</div>}
                      {r.estimated_budget != null && <div><b style={{ color: 'var(--text-tertiary)' }}>งบประมาณประเมิน: </b><span style={{ color: '#10b981', fontWeight: 700 }}>{Number(r.estimated_budget).toLocaleString('th-TH')} บาท</span></div>}
                      {r.customer_decision && <div><b style={{ color: 'var(--text-tertiary)' }}>การตัดสินใจ: </b>{dc?.label || r.customer_decision}</div>}
                      {r.customer_interest && <div style={{ gridColumn: '1/-1' }}><b style={{ color: 'var(--text-tertiary)' }}>ความต้องการ: </b>{r.customer_interest}</div>}
                    </div>

                    {/* RENDER ROOM-BY-ROOM VISIT PLANS */}
                    {pastRoomPlans.length > 0 && (
                      <div style={{ marginTop: '0.4rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563eb', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Layers size={14} /> รายละเอียดแผนงานแยกตามห้อง ({pastRoomPlans.length} ห้อง):
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                          {pastRoomPlans.map((rm, idx) => (
                            <div
                              key={rm.id || idx}
                              style={{
                                background: 'var(--bg-primary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '0.65rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.4rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                                  {getRoomIcon(rm.room_name)} {rm.room_name}
                                </span>
                                {rm.room_size && (
                                  <span style={{ fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.45rem', borderRadius: '4px', fontWeight: 600 }}>
                                    📐 {rm.room_size}
                                  </span>
                                )}
                              </div>

                              {/* Systems badges */}
                              {rm.improvement_systems && rm.improvement_systems.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                  {rm.improvement_systems.map(sys => {
                                    const sObj = IMPROVEMENT_SYSTEMS.find(s => s.id === sys);
                                    const customLabel = sys === 'อื่นๆ' && rm.custom_system ? `อื่นๆ (${rm.custom_system})` : (sObj ? `${sObj.icon} ${sObj.label}` : sys);
                                    return (
                                      <span
                                        key={sys}
                                        style={{
                                          fontSize: '0.68rem',
                                          background: sObj?.bg || 'var(--bg-tertiary)',
                                          color: sObj?.color || 'var(--text-primary)',
                                          border: `1px solid ${sObj?.border || 'var(--border-color)'}`,
                                          padding: '0.1rem 0.4rem',
                                          borderRadius: '4px',
                                          fontWeight: 600
                                        }}
                                      >
                                        {customLabel}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Room condition */}
                              {rm.condition_notes && (
                                <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                  📝 {rm.condition_notes}
                                </div>
                              )}

                              {/* Room photo thumbnail */}
                              {rm.photo && (
                                <div
                                  onClick={() => setPreviewImageModal({ url: rm.photo!, title: `รูปภาพ ${rm.room_name}` })}
                                  style={{
                                    width: '100%',
                                    height: '90px',
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-color)',
                                    cursor: 'pointer',
                                    position: 'relative'
                                  }}
                                >
                                  <img src={rm.photo} alt={`รูปภาพ ${rm.room_name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 5px', borderRadius: '4px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                    <ZoomIn size={10} /> ดูรูป
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Past Overall Photos */}
                    {r.photos && r.photos.length > 0 && (
                      <div style={{ marginTop: '0.4rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9333ea', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Camera size={13} color="#9333ea" /> รูปภาพภาพรวมหน้างาน ({r.photos.length} รูป):
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
                          {r.photos.map((pUrl, pIdx) => (
                            <div 
                              key={pIdx} 
                              onClick={() => setPreviewImageModal({ url: pUrl, title: `รูปที่ ${pIdx + 1}` })}
                              style={{ width: '70px', height: '70px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', flexShrink: 0, cursor: 'pointer' }}
                            >
                              <img src={pUrl} alt={`Visit Photo ${pIdx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

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
