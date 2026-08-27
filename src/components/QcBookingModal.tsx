import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, User as UserIcon, CheckCircle2, 
  AlertCircle, ShieldCheck, Check, Sparkles, AlertTriangle, 
  ChevronRight, Lock, MapPin, Phone
} from 'lucide-react';
import { formatToDDMMYYYY, getTodayDateString, isDateInPast } from '../utils';
import { CustomDateInput } from './CustomDateInput';

export interface QcSlotInfo {
  slot: string;
  label: string;
  sequence: number;
  isBooked: boolean;
  booking?: {
    title: string;
    customerName: string;
    customerPhone: string;
    siteAddress: string;
    status: string;
    leadId?: string;
    projectId?: string;
  } | null;
}

export interface QcScheduleUser {
  qcId: string;
  qcName: string;
  email: string;
  avatar?: string;
  globalRole?: string;
  department?: string;
  totalBooked: number;
  totalSlots: number;
  isFullyBooked: boolean;
  slots: QcSlotInfo[];
}

interface QcBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  currentAssigneeName?: string;
  currentTimeSlot?: string;
  leadInfo?: {
    id: string;
    customerName: string;
    customerPhone?: string;
    address?: string;
    jobType?: string;
  } | null;
  onSelectBooking: (booking: {
    qcId: string;
    qcName: string;
    date: string;
    timeSlot: string;
    timeOnly: string;
  }) => void;
}

const normalizeDateToIso = (dateStr?: string | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const trimmed = dateStr.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }
  return trimmed;
};

const DEFAULT_QC_LIST: QcScheduleUser[] = [
  { qcId: 'usr-1787570477929', qcName: 'QC1 see', email: 'qc1@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc2', qcName: 'QC2 สมชาย (โซนบางนา-สมุทรปราการ)', email: 'qc2@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc3', qcName: 'QC3 วิทยา (โซนลาดกระบัง-สุวรรณภูมิ)', email: 'qc3@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc4', qcName: 'QC4 อนุชา (โซนจตุจักร-รัชดา)', email: 'qc4@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc5', qcName: 'QC5 ธีรภัทร (โซนงามวงศ์วาน-นนทบุรี)', email: 'qc5@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc6', qcName: 'QC6 ธนากร (โซนธนบุรี-พระราม 2)', email: 'qc6@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc7', qcName: 'QC7 พงศกร (โซนรังสิต-ปทุมธานี)', email: 'qc7@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc8', qcName: 'QC8 สมศักดิ์ (โซนบางแค-เพชรเกษม)', email: 'qc8@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc9', qcName: 'QC9 วรวัฒน์ (โซนมีนบุรี-รามอินทรา)', email: 'qc9@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]},
  { qcId: 'usr-qc10', qcName: 'QC10 ศุภชัย (โซนพระราม 9-ห้วยขวาง)', email: 'qc10@chg.co.th', department: 'QC', globalRole: 'Employee', totalBooked: 0, totalSlots: 4, isFullyBooked: false, slots: [
    { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)', sequence: 1, isBooked: false, booking: null },
    { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)', sequence: 2, isBooked: false, booking: null },
    { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)', sequence: 3, isBooked: false, booking: null },
    { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)', sequence: 4, isBooked: false, booking: null }
  ]}
];

export const QcBookingModal: React.FC<QcBookingModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  currentAssigneeName = '',
  currentTimeSlot = '',
  leadInfo,
  onSelectBooking
}) => {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = normalizeDateToIso(initialDate);
    return d && !isDateInPast(d) ? d : todayStr;
  });
  const [teamSchedule, setTeamSchedule] = useState<QcScheduleUser[]>(DEFAULT_QC_LIST);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedQcId, setSelectedQcId] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>(currentTimeSlot || '');

  // Quick date jump
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + Math.max(0, offsetDays));
    const nextDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setSelectedDate(nextDate);
  };

  const fetchSchedule = async (date: string) => {
    const isoDate = normalizeDateToIso(date);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/qc-plans/team-schedule?date=${isoDate}`);
      if (res.ok) {
        const data = await res.json();
        const schedule: QcScheduleUser[] = data.teamSchedule || [];
        if (schedule.length > 0) {
          setTeamSchedule(schedule);

          // Auto select first available QC if none selected
          if (!selectedQcId || !schedule.some(s => s.qcId === selectedQcId)) {
            const matchExisting = schedule.find(s => s.qcName === currentAssigneeName || s.qcId === currentAssigneeName);
            if (matchExisting) {
              setSelectedQcId(matchExisting.qcId);
            } else {
              const firstAvailable = schedule.find(s => !s.isFullyBooked) || schedule[0];
              setSelectedQcId(firstAvailable.qcId);
            }
          }
          return;
        }
      }
      // Fallback
      setTeamSchedule(DEFAULT_QC_LIST);
      if (!selectedQcId) {
        setSelectedQcId(DEFAULT_QC_LIST[0].qcId);
      }
    } catch (err) {
      console.error('Error fetching QC schedule:', err);
      setTeamSchedule(DEFAULT_QC_LIST);
      if (!selectedQcId) {
        setSelectedQcId(DEFAULT_QC_LIST[0].qcId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const d = normalizeDateToIso(initialDate);
      const validDate = d && !isDateInPast(d) ? d : todayStr;
      setSelectedDate(validDate);
      fetchSchedule(validDate);
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchSchedule(selectedDate);
    }
  }, [selectedDate]);

  if (!isOpen) return null;

  const currentQc = teamSchedule.find(s => s.qcId === selectedQcId) || teamSchedule[0];

  const handleConfirm = () => {
    if (selectedDate && isDateInPast(selectedDate)) {
      alert('⚠️ ไม่สามารถจองคิววันย้อนหลังได้ กรุณาเลือกวันปัจจุบันหรือวันล่วงหน้า');
      return;
    }
    if (!currentQc) {
      alert('กรุณาเลือกเจ้าหน้าที่ QC');
      return;
    }
    if (!selectedSlot) {
      alert('กรุณาเลือกช่วงเวลานัดหมาย');
      return;
    }

    // Check if slot is already booked
    const slotData = currentQc.slots.find(s => s.slot === selectedSlot);
    if (slotData?.isBooked) {
      alert(`⚠️ ช่วงเวลา "${selectedSlot}" ของคุณ ${currentQc.qcName} ถูกจองแล้ว ไม่สามารถเลือกซ้ำได้`);
      return;
    }

    // Extract start time for standard appointment_time (e.g. "09:00 - 11:00 น." -> "09:00")
    const timeMatch = selectedSlot.match(/^(\d{2}:\d{2})/);
    const timeOnly = timeMatch ? timeMatch[1] : '09:00';

    onSelectBooking({
      qcId: currentQc.qcId,
      qcName: currentQc.qcName,
      date: selectedDate,
      timeSlot: selectedSlot,
      timeOnly
    });

    onClose();
  };

  return (
    <div 
      style={{
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
        zIndex: 1300,
        padding: '1rem'
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '880px',
          maxWidth: '98%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.45)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldCheck size={24} color="#059669" />
              จองคิวตรวจหน้างาน & ตรวจสอบคิวว่าง QC
            </h2>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              เลือกรอบเวลาที่ไม่ชนกับงานอื่น ระบบจะล็อกตารางคิวงานแบบ Real-time ป้องกันการจองซ้ำซ้อน
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Target Lead Info Pill (If provided) */}
          {leadInfo && (
            <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🎯 จุดตรวจที่ต้องการจอง:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{leadInfo.customerName}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {leadInfo.customerPhone && <span>📞 {leadInfo.customerPhone}</span>}
                  {leadInfo.address && <span>📍 {leadInfo.address}</span>}
                </div>
              </div>
              {leadInfo.jobType && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563eb', background: '#dbeafe', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  {leadInfo.jobType}
                </span>
              )}
            </div>
          )}

          {/* Date Selector Bar */}
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={18} color="#9333ea" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>วันที่ต้องการจองคิว:</span>
              <div style={{ width: '160px' }}>
                <CustomDateInput
                  value={selectedDate}
                  min={todayStr}
                  onChange={e => {
                    const val = e.target.value;
                    if (val && isDateInPast(val)) {
                      alert('⚠️ ไม่สามารถเลือกวันจองคิวย้อนหลังได้ กรุณาเลือกวันปัจจุบันหรือวันล่วงหน้า');
                      setSelectedDate(todayStr);
                      return;
                    }
                    setSelectedDate(val);
                  }}
                  style={{
                    padding: '0.35rem 0.65rem',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: 700
                  }}
                />
              </div>
            </div>

            {/* Quick jump buttons */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: selectedDate === todayStr ? '#2563eb' : 'var(--bg-secondary)',
                  color: selectedDate === todayStr ? 'white' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: selectedDate === todayStr ? 700 : 400,
                  cursor: 'pointer'
                }}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                +1 วัน (พรุ่งนี้)
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(2)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                +2 วัน
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(3)}
                style={{
                  padding: '0.3rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                +3 วัน
              </button>
            </div>
          </div>

          {/* 2 Columns: Left = Select QC User, Right = Time Slots & Locking */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '1.25rem' }}>
            
            {/* Column 1: QC Officer List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserIcon size={16} color="#059669" />
                1. เลือกเจ้าหน้าที่ QC / ผู้สำรวจ:
              </span>

              {isLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  กำลังตรวจสอบตารางคิวงาน...
                </div>
              ) : teamSchedule.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  ไม่พบข้อมูลผู้ใช้งาน QC
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
                  {teamSchedule.map(u => {
                    const isSelected = selectedQcId === u.qcId;
                    const availableSlots = u.totalSlots - u.totalBooked;

                    return (
                      <div
                        key={u.qcId}
                        onClick={() => {
                          setSelectedQcId(u.qcId);
                          // reset slot if current is booked
                          const slotInfo = u.slots.find(s => s.slot === selectedSlot);
                          if (slotInfo?.isBooked) {
                            setSelectedSlot('');
                          }
                        }}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #059669' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-tertiary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: isSelected ? '#059669' : '#64748b',
                            color: 'white',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {u.qcName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                              {u.qcName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              แผนก {u.department || 'QC'} • {u.globalRole || 'Employee'}
                            </div>
                          </div>
                        </div>

                        {/* Workload badge */}
                        <div style={{ textAlign: 'right' }}>
                          {u.isFullyBooked ? (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              🔒 เต็มทั้ง 4 คิว
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                              ว่าง {availableSlots} คิว
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 2: Time Slots & Status (Locked vs Free) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={16} color="#2563eb" />
                  2. เลือกช่วงเวลานัดหมาย (Time Slot):
                </span>
                {currentQc && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    ตารางของ: <strong style={{ color: '#059669' }}>{currentQc.qcName}</strong> ({formatToDDMMYYYY(selectedDate)})
                  </span>
                )}
              </div>

              {!currentQc ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  กรุณาเลือกเจ้าหน้าที่ QC ทางซ้ายมือก่อน
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {currentQc.slots.map(s => {
                    const isSelected = selectedSlot === s.slot;

                    if (s.isBooked) {
                      // LOCKED / CONFLICT SLOT
                      return (
                        <div
                          key={s.slot}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: 0.85,
                            cursor: 'not-allowed'
                          }}
                          title="ช่วงเวลานี้มีนัดหมายแล้ว ไม่สามารถเลือกได้"
                        >
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Lock size={14} /> {s.slot}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {s.booking?.customerName ? `ติดงาน: ${s.booking.customerName}` : s.booking?.title || 'ติดคิวงานตรวจ'}
                              {s.booking?.siteAddress ? ` (${s.booking.siteAddress.slice(0, 30)}...)` : ''}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            🔒 ไม่ว่าง / มีนัดแล้ว
                          </span>
                        </div>
                      );
                    }

                    // AVAILABLE SLOT (CLICK TO SELECT)
                    return (
                      <div
                        key={s.slot}
                        onClick={() => setSelectedSlot(s.slot)}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #2563eb' : '1px solid var(--border-color)',
                          background: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-tertiary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? '#1d4ed8' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Clock size={14} color={isSelected ? '#2563eb' : '#059669'} /> {s.slot}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {s.label}
                          </div>
                        </div>

                        {isSelected ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '0.2rem 0.6rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Check size={12} /> เลือกช่วงเวลานี้
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.12)', padding: '0.2rem 0.55rem', borderRadius: '4px' }}>
                            🟢 ว่าง (คลิกเลือก)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)' }}>
          <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
            {currentQc && selectedSlot ? (
              <span style={{ color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={16} /> พร้อมจอง: {currentQc.qcName} • {formatToDDMMYYYY(selectedDate)} ({selectedSlot})
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>
                * กรุณาเลือกเจ้าหน้าที่และช่วงเวลาที่ว่าง
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!currentQc || !selectedSlot}
              style={{
                padding: '0.55rem 1.5rem',
                borderRadius: '8px',
                background: (!currentQc || !selectedSlot) ? '#9ca3af' : 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none',
                color: 'white',
                cursor: (!currentQc || !selectedSlot) ? 'not-allowed' : 'pointer',
                fontWeight: 800,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: (!currentQc || !selectedSlot) ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Check size={16} /> ยืนยันการจองคิว QC
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
