import React, { useState, useEffect, useRef } from 'react';
import type { User, Project } from '../types';
import { canOperateProject } from '../utils';
import { CustomDateInput } from './CustomDateInput';
import {
  X, CheckCircle2, AlertCircle, ShieldCheck, Star,
  FileCheck, DollarSign, Upload, Trash2, RefreshCw,
  Send, PenTool, Award, Users, Camera, FileText, Check, AlertTriangle,
  Smartphone, MapPin, CheckSquare, Eye
} from 'lucide-react';

interface QCInspection {
  id: string;
  project_id: string;
  inspector_id?: string | null;
  inspector_name?: string | null;
  inspector_name_ref?: string | null;
  inspection_date: string;
  qc_type?: 'online' | 'onsite' | string;
  checklist_items: Array<{ item: string; passed: boolean; note?: string }>;
  overall_result: 'Passed' | 'Failed - Rework Needed' | string;
  qc_notes?: string | null;
  photos: string[];
  created_at: string;
}

interface ProjectHandover {
  id: string;
  project_id: string;
  qc_id?: string | null;
  customer_name: string;
  customer_phone?: string;
  handover_date: string;
  customer_satisfied: boolean;
  satisfaction_score: number;
  customer_signature?: string | null;
  warranty_months: number;
  warranty_start_date?: string | null;
  warranty_end_date?: string | null;
  final_payment_amount: number;
  final_payment_status: string;
  settlement_notes?: string | null;
  status: string;
  created_at: string;
}

interface QCHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  currentUser: User | null;
  users?: User[];
  onSaved?: () => void;
}

const ONSITE_CHECKLIST = [
  'ความเรียบร้อยของพื้นผิว โครงสร้าง และแนวรอยต่อ (On-site Surface & Structure)',
  'ระบบท่อน้ำ ปลั๊กไฟ และความปลอดภัยในการใช้งาน (Plumbing & Electrical Safety)',
  'ความสะอาดของพื้นที่และการเก็บเศษวัสดุหน้างาน (Site Cleanliness & Debris)',
  'ทดสอบการทำงานจริงของอุปกรณ์/เครื่องจักรครบถ้วน (Operational Testing)',
  'ตรงตามแบบแปลน 2D/3D และขอบเขตงานในสัญญา (2D/3D Blueprint Compliance)'
];

const ONLINE_CHECKLIST = [
  'ความสมบูรณ์ของจุดติดตั้งตามรูปถ่ายที่ช่างส่งมา (Installation Completeness via Photos)',
  'มุมมองภาพถ่ายครอบคลุมจุดสำคัญครบถ้วน (Photo Proof Quality & Coverage)',
  'ความเรียบร้อยรอบจุดติดตั้ง ไม่มีความเสียหายต่อบริเวณรอบข้าง (No Collateral Damage)',
  'ทดสอบการทำงานและผลลัพธ์ผ่านรูป/คลิปที่รายงาน (Functionality Proof)'
];

export const QCHandoverModal: React.FC<QCHandoverModalProps> = ({
  isOpen, onClose, project, currentUser, users = [], onSaved
}) => {
  const [activeTab, setActiveTab] = useState<'qc' | 'handover' | 'settle'>('qc');
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [handoverData, setHandoverData] = useState<ProjectHandover | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Determine default QC mode: Quick Job vs Renovate
  const isQuickDefault = project?.projectType === 'quick_service' || 
                         project?.id?.startsWith('PQ') || 
                         project?.name?.toLowerCase().includes('quick');

  const [qcMode, setQcMode] = useState<'online' | 'onsite'>(isQuickDefault ? 'online' : 'onsite');

  // --- TAB 1: QC Inspection Form states ---
  const [inspectorId, setInspectorId] = useState(currentUser?.id || '');
  const [inspectionDate, setInspectionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [checklist, setChecklist] = useState<Array<{ item: string; passed: boolean; note: string }>>([]);
  const [overallResult, setOverallResult] = useState<'Passed' | 'Failed - Rework Needed'>('Passed');
  const [qcNotes, setQcNotes] = useState('');
  const [qcPhotos, setQcPhotos] = useState<string[]>([]);
  const qcFileInputRef = useRef<HTMLInputElement>(null);

  // --- TAB 2: Handover & Signature Form states ---
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [handoverDate, setHandoverDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerSatisfied, setCustomerSatisfied] = useState(true);
  const [satisfactionScore, setSatisfactionScore] = useState(5);
  const [warrantyMonths, setWarrantyMonths] = useState(12);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- TAB 3: Settlement states ---
  const [finalPaymentAmount, setFinalPaymentAmount] = useState('0');
  const [finalPaymentStatus, setFinalPaymentStatus] = useState('Paid');
  const [settlementNotes, setSettlementNotes] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Synchronize checklist when qcMode changes
  useEffect(() => {
    const list = qcMode === 'online' ? ONLINE_CHECKLIST : ONSITE_CHECKLIST;
    setChecklist(list.map(item => ({ item, passed: true, note: '' })));
  }, [qcMode]);

  const fetchQCData = async () => {
    if (!project) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/qc`, {
        headers: { 'X-User-Id': currentUser?.id || '' }
      });
      if (res.ok) {
        const data = await res.json();
        setInspections(data.inspections || []);
        setHandoverData(data.handover || null);
        if (data.handover) {
          setCustomerSatisfied(data.handover.customer_satisfied);
          setSatisfactionScore(data.handover.satisfaction_score || 5);
          setSignatureData(data.handover.customer_signature || null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      const isQuick = project.projectType === 'quick_service' || 
                      project.id?.startsWith('PQ') || 
                      project.name?.toLowerCase().includes('quick');
      const initialMode = isQuick ? 'online' : 'onsite';
      setQcMode(initialMode);
      setChecklist((initialMode === 'online' ? ONLINE_CHECKLIST : ONSITE_CHECKLIST).map(item => ({ item, passed: true, note: '' })));
      
      fetchQCData();
      setInspectorId(currentUser?.id || '');
      setInspectionDate(new Date().toISOString().split('T')[0]);
      setOverallResult('Passed');
      setQcNotes('');
      setQcPhotos([]);
      setCustomerName(project.customerName || (project as any).customer_name || '');
      setCustomerPhone(project.customerPhone || (project as any).customer_phone || '');
      setFinalPaymentAmount(String(project.budget || '0'));
      setActiveTab('qc');
    }
  }, [isOpen, project?.id]);

  // Canvas E-Signature handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e40af';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureData(canvas.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const handleQCPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const res = event.target?.result as string;
        if (res) setQcPhotos(prev => [...prev, res]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit QC Inspection
  const handleSubmitQC = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const perm = canOperateProject(currentUser, project);
    if (!perm.allowed) {
      showToast(perm.reason || 'ไม่มีสิทธิ์บันทึกผล QC', 'error');
      return;
    }
    setIsSaving(true);
    const inspector = users.find(u => u.id === inspectorId);
    try {
      const res = await fetch(`/api/projects/${project.id}/qc/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({
          inspector_id: inspectorId || null,
          inspector_name: inspector?.name || currentUser?.name || 'QC Inspector',
          inspection_date: inspectionDate,
          qc_type: qcMode,
          checklist_items: checklist,
          overall_result: overallResult,
          qc_notes: qcNotes || null,
          photos: qcPhotos,
          created_by: currentUser?.name || 'System'
        })
      });

      if (res.ok) {
        showToast(
          overallResult === 'Passed'
            ? `✅ บันทึกผล QC (${qcMode === 'online' ? 'Online Review' : 'On-site Inspection'}) ผ่านแล้ว!`
            : `⚠️ บันทึกผล QC ไม่ผ่าน (ส่งกลับไปให้ช่างแก้ไขงาน Rework)`,
          overallResult === 'Passed' ? 'success' : 'error'
        );
        await fetchQCData();
        if (overallResult === 'Passed') setActiveTab('handover');
        onSaved?.();
      } else {
        showToast('เกิดข้อผิดพลาดในการบันทึก QC', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Submit Handover & Settlement
  const handleSubmitHandoverAndSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    const perm = canOperateProject(currentUser, project);
    if (!perm.allowed) {
      showToast(perm.reason || 'ไม่มีสิทธิ์ปิดโครงการและส่งมอบงาน', 'error');
      return;
    }
    setIsSaving(true);
    const startDate = handoverDate || new Date().toISOString().split('T')[0];
    const end = new Date(startDate);
    end.setMonth(end.getMonth() + warrantyMonths);

    try {
      const latestQc = inspections[0];
      const res = await fetch(`/api/projects/${project.id}/qc/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': currentUser?.id || '' },
        body: JSON.stringify({
          qc_id: latestQc?.id || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          handover_date: handoverDate,
          customer_satisfied: customerSatisfied,
          satisfaction_score: satisfactionScore,
          customer_signature: signatureData,
          warranty_months: warrantyMonths,
          warranty_start_date: startDate,
          warranty_end_date: end.toISOString().split('T')[0],
          final_payment_amount: parseFloat(finalPaymentAmount || '0'),
          final_payment_status: finalPaymentStatus,
          settlement_notes: settlementNotes || null,
          technicians_summary: project.members || [],
          created_by: currentUser?.name || 'System'
        })
      });

      if (res.ok) {
        showToast('🎉 ปิดโครงการและส่งมอบงานสมบูรณ์เรียบร้อยแล้ว!', 'success');
        await fetchQCData();
        onSaved?.();
        setTimeout(() => onClose(), 1500);
      } else {
        showToast('เกิดข้อผิดพลาดในการปิดโครงการ', 'error');
      }
    } catch {
      showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !project) return null;

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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      zIndex: 1500, padding: '1rem', overflowY: 'auto'
    }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 2000,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '0.75rem 1.25rem', borderRadius: '10px',
          fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      <div style={{
        background: 'var(--bg-primary)', borderRadius: '16px',
        border: '1px solid var(--border-color)', width: '820px', maxWidth: '96vw',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', margin: 'auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(135deg, #4338ca 0%, #059669 100%)',
          borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '0.5rem', borderRadius: '8px', display: 'flex' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>
                ตรวจรับคุณภาพ QC & ส่งมอบงานปิดโครงการ (QC, Handover & Settle)
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)' }}>
                {project.name} · รหัส {project.id} · {isQuickDefault ? '⚡ Quick Job' : '🏗️ Renovate / Project'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          {[
            { key: 'qc' as const, label: '1. 🔍 ตรวจสอบคุณภาพ (QC Inspection)' },
            { key: 'handover' as const, label: '2. ✍️ ส่งมอบงาน & E-Sign' },
            { key: 'settle' as const, label: '3. 🏁 ตัดจ่าย & ปิด Job (BMT)' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem', border: 'none',
                background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 700 : 500, fontSize: '0.82rem', cursor: 'pointer',
                borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '72vh' }}>

          {/* TAB 1: QC INSPECTION */}
          {activeTab === 'qc' && (
            <form onSubmit={handleSubmitQC} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Dual QC Mode Selector */}
              <div style={{
                background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: '12px',
                border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.4rem'
              }}>
                <label style={{ ...lbl, margin: 0 }}>⚙️ รูปแบบการตรวจประเมินคุณภาพ (QC Inspection Method)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                  <button
                    type="button"
                    onClick={() => setQcMode('online')}
                    style={{
                      padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      border: qcMode === 'online' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
                      background: qcMode === 'online' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    <Smartphone size={18} color={qcMode === 'online' ? '#3b82f6' : 'var(--text-tertiary)'} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: qcMode === 'online' ? '#2563eb' : 'var(--text-primary)' }}>
                        📱 Online QC Review
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        สำหรับ Quick Job (ตรวจผ่านรูปถ่ายที่ช่างส่งมา)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQcMode('onsite')}
                    style={{
                      padding: '0.6rem 0.8rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                      border: qcMode === 'onsite' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      background: qcMode === 'onsite' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                  >
                    <MapPin size={18} color={qcMode === 'onsite' ? '#10b981' : 'var(--text-tertiary)'} />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: qcMode === 'onsite' ? '#059669' : 'var(--text-primary)' }}>
                        📍 On-site QC Inspection
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        สำหรับงาน Renovate / Built-in (ลงตรวจหน้างานจริง)
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ผู้ตรวจ QC / ผู้รับผิดชอบ *</label>
                  {users.length > 0 ? (
                    <select value={inspectorId} onChange={e => setInspectorId(e.target.value)} style={inp}>
                      {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.globalRole || 'QC'})</option>)}
                      <option value="">— ระบุชื่อ —</option>
                    </select>
                  ) : (
                    <input type="text" value={inspectorId} onChange={e => setInspectorId(e.target.value)} style={inp} />
                  )}
                </div>
                <div>
                  <label style={lbl}>วันที่ตรวจประเมิน *</label>
                  <CustomDateInput value={inspectionDate} onChange={e => setInspectionDate(e.target.value)} style={inp} required />
                </div>
              </div>

              {/* Digital QC Checklist */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📋 เกณฑ์การตรวจประเมิน ({qcMode === 'online' ? 'Online Photo Review' : 'On-site Field Checklist'})</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {qcMode === 'online' ? '⚡ 4 ข้อสำหรับ Quick Job' : '🏗️ 5 ข้อสำหรับงาน Renovate'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {checklist.map((item, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-tertiary)', padding: '0.6rem 0.75rem', borderRadius: '8px',
                      border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 500, flex: 1, minWidth: '220px' }}>
                        {idx + 1}. {item.item}
                      </span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...checklist];
                            next[idx].passed = true;
                            setChecklist(next);
                          }}
                          style={{
                            padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                            border: item.passed ? '2px solid #10b981' : '1px solid var(--border-color)',
                            background: item.passed ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                            color: item.passed ? '#059669' : 'var(--text-secondary)'
                          }}
                        >
                          ✅ ผ่าน (Pass)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...checklist];
                            next[idx].passed = false;
                            setChecklist(next);
                          }}
                          style={{
                            padding: '0.3rem 0.75rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
                            border: !item.passed ? '2px solid #ef4444' : '1px solid var(--border-color)',
                            background: !item.passed ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                            color: !item.passed ? '#dc2626' : 'var(--text-secondary)'
                          }}
                        >
                          ❌ ไม่ผ่าน (Defect)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Outcome */}
              <div>
                <label style={lbl}>สรุปผลการประเมินโดยรวม *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setOverallResult('Passed')}
                    style={{
                      padding: '0.65rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                      border: overallResult === 'Passed' ? '2px solid #10b981' : '2px solid var(--border-color)',
                      background: overallResult === 'Passed' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                      color: overallResult === 'Passed' ? '#059669' : 'var(--text-secondary)', textAlign: 'center'
                    }}
                  >
                    🏆 ผ่านเกณฑ์ QC ({qcMode === 'online' ? 'Approved Online' : 'Passed On-site'})
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverallResult('Failed - Rework Needed')}
                    style={{
                      padding: '0.65rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                      border: overallResult === 'Failed - Rework Needed' ? '2px solid #ef4444' : '2px solid var(--border-color)',
                      background: overallResult === 'Failed - Rework Needed' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-tertiary)',
                      color: overallResult === 'Failed - Rework Needed' ? '#dc2626' : 'var(--text-secondary)', textAlign: 'center'
                    }}
                  >
                    ⚠️ ไม่ผ่าน — สั่งช่างแก้งาน (Rework)
                  </button>
                </div>
              </div>

              <div>
                <label style={lbl}>
                  {qcMode === 'online' ? 'บันทึกการตรวจ Online QC / ข้อเสนอแนะ' : 'หมายเหตุการตรวจ On-site QC / รายการสั่งแก้'}
                </label>
                <textarea
                  value={qcNotes}
                  onChange={e => setQcNotes(e.target.value)}
                  placeholder={
                    qcMode === 'online'
                      ? 'เช่น ตรวจสอบภาพถ่ายที่ช่างส่งมาแล้ว งานติดตั้งเรียบร้อยตามมาตรฐาน...'
                      : 'เช่น ตรวจสอบหน้างานจริง งานเรียบร้อย ไม่มีข้อบกพร่อง พร้อมส่งมอบ...'
                  }
                  rows={2}
                  style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
                />
              </div>

              {/* Photos */}
              <div style={{ background: 'var(--bg-secondary)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <label style={lbl}>
                  {qcMode === 'online' ? '📸 รูปถ่ายผลงานที่ช่างส่งมา / รูปตรวจ Online' : '📸 รูปถ่ายหลักฐานการตรวจ On-site'}
                </label>
                <input type="file" ref={qcFileInputRef} onChange={handleQCPhotoUpload} multiple accept="image/*" style={{ display: 'none' }} />
                <button
                  type="button"
                  onClick={() => qcFileInputRef.current?.click()}
                  style={{
                    background: 'var(--bg-tertiary)', border: '1px dashed var(--border-color)',
                    padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--text-primary)',
                    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}
                >
                  <Upload size={14} /> + แนบรูปภาพผลงาน QC
                </button>
                {qcPhotos.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                    {qcPhotos.map((p, idx) => (
                      <img key={idx} src={p} alt={`QC ${idx}`} style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border-color)' }} />
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: isSaving ? '#9ca3af' : 'linear-gradient(135deg, #4338ca, #059669)', border: 'none', color: 'white', fontWeight: 700, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {isSaving ? 'กำลังบันทึก...' : <><Check size={15} /> บันทึกผล {qcMode === 'online' ? 'Online QC Review' : 'On-site QC Inspection'}</>}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: HANDOVER & E-SIGNATURE */}
          {activeTab === 'handover' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ชื่อลูกค้า / ผู้ตรวจรับมอบงาน *</label>
                  <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} style={inp} required />
                </div>
                <div>
                  <label style={lbl}>เบอร์โทรติดต่อ</label>
                  <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} style={inp} />
                </div>
              </div>

              {/* Customer Satisfaction Score */}
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={lbl}>ความพึงพอใจของลูกค้าต่องานติดตั้ง (Customer Satisfaction)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setSatisfactionScore(score)}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: score <= satisfactionScore ? '#f59e0b' : 'var(--text-tertiary)',
                        display: 'flex', alignItems: 'center', padding: '0.2rem'
                      }}
                    >
                      <Star size={28} fill={score <= satisfactionScore ? '#f59e0b' : 'none'} />
                    </button>
                  ))}
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f59e0b', marginLeft: '0.5rem' }}>
                    {satisfactionScore} / 5 ดาว
                  </span>
                </div>
              </div>

              {/* Warranty Setting */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ระยะเวลารับประกัน (เดือน)</label>
                  <select value={warrantyMonths} onChange={e => setWarrantyMonths(parseInt(e.target.value))} style={inp}>
                    <option value={6}>6 เดือน</option>
                    <option value={12}>12 เดือน (1 ปี)</option>
                    <option value={24}>24 เดือน (2 ปี)</option>
                    <option value={36}>36 เดือน (3 ปี)</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>วันเริ่มต้นรับประกัน</label>
                  <CustomDateInput value={handoverDate} onChange={e => setHandoverDate(e.target.value)} style={inp} />
                </div>
              </div>

              {/* HTML5 Canvas E-Signature */}
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ ...lbl, margin: 0 }}>✍️ ลายเซ็นลูกค้า (Digital E-Signature)</label>
                  <button type="button" onClick={clearSignature} style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    ล้างลายเซ็น
                  </button>
                </div>
                <div style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', background: '#ffffff', overflow: 'hidden' }}>
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width: '100%', height: '160px', touchAction: 'none', cursor: 'crosshair', display: 'block' }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.3rem', textAlign: 'center' }}>
                  ใช้เมาส์หรือนิ้วสัมผัสเพื่อเซ็นชื่อลงในช่องสี่เหลี่ยมด้านบน
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setActiveTab('settle')} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  ต่อไป: ตัดจ่าย & ปิด Job ➔
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SETTLEMENT & CLOSE */}
          {activeTab === 'settle' && (
            <form onSubmit={handleSubmitHandoverAndSettle} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  👷‍♂️ สรุปทีมช่างปฏิบัติงานจริง (INT Technicians Settlement)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  ช่างและทีมงานที่บันทึกชั่วโมงทำงาน Timesheet ในโครงการนี้จะได้รับการตัดจ่ายตาม Cost Rate มาตรฐาน
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>ยอดเงินงวดสุดท้ายที่เรียกเก็บ (บาท) *</label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign size={14} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                    <input
                      type="number"
                      value={finalPaymentAmount}
                      onChange={e => setFinalPaymentAmount(e.target.value)}
                      placeholder="0"
                      min={0}
                      style={{ ...inp, paddingLeft: '1.75rem', fontWeight: 700, color: '#10b981' }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={lbl}>สถานะการชำระเงินงวดสุดท้าย</label>
                  <select value={finalPaymentStatus} onChange={e => setFinalPaymentStatus(e.target.value)} style={inp}>
                    <option value="Paid">ชำระครบถ้วนแล้ว (Paid)</option>
                    <option value="Pending">รอตรวจสอบสลิป (Pending)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={lbl}>บันทึกสรุปปิดโครงการ / ข้อมูลบริการหลังการขาย (After-Sales)</label>
                <textarea
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  placeholder="เช่น ส่งมอบกุญแจ, แนะนำคู่มือการใช้งาน, มอบใบรับประกัน 1 ปี..."
                  rows={3}
                  style={{ ...inp, resize: 'vertical' } as React.CSSProperties}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setActiveTab('handover')} style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
                  ย้อนกลับ
                </button>
                <button type="submit" disabled={isSaving} style={{ padding: '0.65rem 1.75rem', borderRadius: '8px', background: isSaving ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.9rem', cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}>
                  {isSaving ? 'กำลังปิดโครงการ...' : <><Award size={17} /> 🏁 ยืนยันปิดโครงการสมบูรณ์ (Close & Settle Job)</>}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default QCHandoverModal;
