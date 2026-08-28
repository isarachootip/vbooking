import React, { useState, useEffect } from 'react';
import {
  X, History, Calendar, CheckCircle2, Clock, User as UserIcon,
  Building, Palette, DollarSign, ArrowRight, ShieldCheck, Check,
  AlertCircle, RefreshCw, Layers, FileText
} from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';

interface TimelineEvent {
  id: string;
  step: number;
  type: string;
  title: string;
  timestamp: string;
  actor: string;
  description?: string;
  appointment_date?: string;
  appointment_time?: string;
  actual_visit_date?: string;
  payment_date?: string;
  status: string;
  color: string;
}

interface TimelineData {
  lead_id: string;
  customer_name: string;
  current_status: string;
  created_at: string;
  updated_at: string;
  events: TimelineEvent[];
}

interface LeadTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: {
    id: string;
    customer_name: string;
    customer_phone?: string;
    job_type?: string;
    status?: string;
    created_at?: string;
  } | null;
}

const STEP_LABELS = [
  { step: 1, label: 'รับ Lead', icon: UserIcon },
  { step: 2, label: 'ติดตาม & นัดหมาย', icon: Calendar },
  { step: 3, label: 'GM อนุมัติ Site', icon: ShieldCheck },
  { step: 4, label: 'ผลการเข้า Visit', icon: Building },
  { step: 5, label: 'ตรวจรับแบบ 3D', icon: Palette },
  { step: 6, label: 'ชำระมัดจำ', icon: DollarSign },
  { step: 7, label: 'เปิดโครงการ', icon: CheckCircle2 }
];

export const LeadTimelineModal: React.FC<LeadTimelineModalProps> = ({
  isOpen, onClose, lead
}) => {
  const [data, setData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTimeline = async (leadId: string) => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      const storedUserStr = typeof window !== 'undefined' ? localStorage.getItem('nt_current_user') : null;
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          if (storedUser && storedUser.id) {
            headers['X-User-Id'] = storedUser.id;
          }
        } catch {}
      }

      const res = await fetch(`/api/leads/${leadId}/timeline`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        console.error('Timeline API error status:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch lead timeline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && lead?.id) {
      fetchTimeline(lead.id);
    } else {
      setData(null);
    }
  }, [isOpen, lead?.id]);

  if (!isOpen || !lead) return null;

  const formatDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} • ${hh}:${min}:${ss} น.`;
    } catch {
      return dateStr;
    }
  };

  // Determine which steps have been reached/completed
  const completedSteps = new Set(data?.events.map(e => e.step) || [1]);

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-primary)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(147, 51, 234, 0.04))'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
            }}>
              <History size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                🕒 ประวัติและบันทึกเวลาแต่ละขั้นตอน (Lead Lifecycle Timeline)
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                ลูกค้า: <strong style={{ color: 'var(--text-primary)' }}>{lead.customer_name}</strong> {lead.customer_phone ? `(${lead.customer_phone})` : ''} • ประเภท: {lead.job_type || 'ทั่วไป'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={() => fetchTimeline(lead.id)}
              disabled={isLoading}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.45rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="รีเฟรชประวัติ"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '0.45rem',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 7-Step Progress Pipeline */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-color)',
          overflowX: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', minWidth: '600px', justifyContent: 'space-between' }}>
            {STEP_LABELS.map((item, idx) => {
              const isCompleted = completedSteps.has(item.step);
              const StepIcon = item.icon;
              return (
                <React.Fragment key={item.step}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isCompleted ? '#2563eb' : 'var(--bg-secondary)',
                      border: isCompleted ? '2px solid #2563eb' : '2px dashed var(--border-color)',
                      color: isCompleted ? '#ffffff' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      boxShadow: isCompleted ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}>
                      {isCompleted ? <Check size={16} /> : <StepIcon size={14} />}
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: isCompleted ? 700 : 500,
                      color: isCompleted ? 'var(--text-primary)' : 'var(--text-muted)',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div style={{
                      flex: 1,
                      height: '2px',
                      background: completedSteps.has(item.step + 1) ? '#2563eb' : 'var(--border-color)',
                      margin: '0 0.5rem -0.8rem 0.5rem',
                      transition: 'all 0.2s ease'
                    }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Timeline Events List */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
              กำลังโหลดไทม์ไลน์บันทึกเวลา...
            </div>
          ) : !data || data.events.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              ยังไม่มีประวัติการบันทึกเวลาของลูกค้ารายนี้
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute',
                left: '7px',
                top: '12px',
                bottom: '12px',
                width: '2px',
                background: 'var(--border-color)'
              }} />

              {/* Events */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {data.events.map((event, idx) => (
                  <div key={event.id || idx} style={{ position: 'relative' }}>
                    {/* Node Dot */}
                    <div style={{
                      position: 'absolute',
                      left: '-1.5rem',
                      top: '4px',
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: event.color || '#2563eb',
                      border: '3px solid var(--bg-primary)',
                      boxShadow: `0 0 0 2px ${event.color || '#2563eb'}`,
                      zIndex: 2
                    }} />

                    {/* Card Content */}
                    <div style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '10px',
                      padding: '0.85rem 1.1rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: event.color || 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ background: `${event.color}15`, color: event.color, padding: '0.1rem 0.45rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                            Step {event.step}
                          </span>
                          {event.title}
                        </span>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#2563eb',
                          background: 'rgba(37, 99, 235, 0.08)',
                          padding: '0.15rem 0.55rem',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontFamily: 'monospace'
                        }}>
                          <Clock size={12} /> {formatDateTime(event.timestamp)}
                        </span>
                      </div>

                      {event.description && (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0.25rem 0', lineHeight: 1.45 }}>
                          {event.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.45rem', paddingTop: '0.45rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          👤 ผู้ดำเนินการ: <strong style={{ color: 'var(--text-primary)' }}>{event.actor}</strong>
                        </span>
                        {event.appointment_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#9333ea', fontWeight: 600 }}>
                            📅 เวลานัดหมาย: {formatToDDMMYYYY(event.appointment_date)} {event.appointment_time || ''}
                          </span>
                        )}
                        {event.actual_visit_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#1e40af', fontWeight: 600 }}>
                            📍 วันที่ลงพื้นที่จริง: {formatToDDMMYYYY(event.actual_visit_date)}
                          </span>
                        )}
                        {event.payment_date && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#059669', fontWeight: 600 }}>
                            💵 วันที่ชำระ: {formatToDDMMYYYY(event.payment_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-tertiary)'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            ระบบบันทึกเวลาตามมาตรฐาน ISO 8601 สำหรับการตรวจสอบ Audit Trail ทุกขั้นตอน
          </span>
          <button
            onClick={onClose}
            style={{
              padding: '0.45rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
