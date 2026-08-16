import React, { useState } from 'react';
import type { TaskTemplate, User, MasterProjectType, ServicePriceItem } from '../types';
import { Layers, Plus, Trash2, Edit, Database, Layers3, Sparkles, BookOpen, ArrowRight, CheckCircle2, Zap, Wrench, ShieldCheck, Home } from 'lucide-react';
import { PriceBookManager } from './PriceBookManager';
import { getWorkflowStagesForType, getWorkflowColumnsForType } from '../config/workflows';

interface MasterManagementProps {
  taskTemplates: TaskTemplate[];
  setTaskTemplates?: React.Dispatch<React.SetStateAction<TaskTemplate[]>>;
  masterProjectTypes: MasterProjectType[];
  setMasterProjectTypes?: (types: MasterProjectType[]) => void;
  priceBook?: ServicePriceItem[];
  setPriceBook?: (pb: ServicePriceItem[]) => void;
  currentUser: User | null;
  fetchInitialData?: () => void;
  masterBranches?: any[];
  masterZones?: any[];
}



export const defaultMasterTypes: MasterProjectType[] = [
  {
    id: 'quick_service',
    name: 'Quick service',
    badgeText: 'Quick service ⚡',
    color: '#f59e0b',
    iconName: 'Zap',
    description: 'โครงการงานบริการด่วน งานแก้ไขและซ่อมแซมเร่งด่วน มีเฉพาะ Task เดี่ยว ดำเนินการเสร็จรวดเร็ว',
    isActive: true,
    taskTypeStyle: 'single'
  },
  {
    id: 'installer',
    name: 'Installer (งานติดตั้ง)',
    badgeText: 'งานติดตั้ง 🛠️',
    color: '#2563eb',
    iconName: 'Wrench',
    description: 'โครงการติดตั้งอุปกรณ์ ตรวจสอบคุณภาพประกอบระบบ และส่งมอบงานติดตั้งหน้างาน',
    isActive: true,
    taskTypeStyle: 'workflow'
  },
  {
    id: 'renovate',
    name: 'Renovate (งานรีโนเวท)',
    badgeText: 'Renovate 🏡',
    color: '#8B0000',
    iconName: 'Home',
    description: 'โครงการปรับปรุง รีโนเวทบ้าน และตกแต่งอาคารสถานที่ครบวงจร (สำรวจ -> ออกแบบ -> เสนอราคา -> ก่อสร้าง)',
    isActive: true,
    taskTypeStyle: 'workflow'
  },
  {
    id: 'build_in',
    name: 'Build-in (งานบิวท์อิน)',
    badgeText: 'Build-in 🛋️',
    color: '#8b5cf6',
    iconName: 'Box',
    description: 'โครงการออกแบบ ผลิต และติดตั้งงานเฟอร์นิเจอร์บิวท์อินเฉพาะทาง',
    isActive: true,
    taskTypeStyle: 'workflow'
  },
  {
    id: 'new_house',
    name: 'New house (สร้างบ้านใหม่)',
    badgeText: 'New house 🏠',
    color: '#059669',
    iconName: 'Home',
    description: 'โครงการงานก่อสร้างบ้านใหม่และอาคารสิ่งปลูกสร้าง',
    isActive: true,
    taskTypeStyle: 'workflow'
  },
  {
    id: 'maintenance',
    name: 'Maintenance (งานซ่อมบำรุง MA)',
    badgeText: 'MA 🔧',
    color: '#3b82f6',
    iconName: 'ShieldCheck',
    description: 'โครงการดูแลระบบ ซ่อมแซมบำรุงรักษาตามสัญญา MA',
    isActive: true,
    taskTypeStyle: 'sla'
  }
];

export const MasterManagement = ({
  taskTemplates,
  masterProjectTypes,
  setMasterProjectTypes,
  priceBook = [],
  setPriceBook,
  currentUser: _currentUser,
  fetchInitialData,
  masterBranches = [],
  masterZones = []
}: MasterManagementProps) => {
  const [activeTab, setActiveTab] = useState<'project_types' | 'task_templates' | 'workflow_stages' | 'price_book' | 'vq_branches' | 'vq_zones'>('project_types');

  // Use props instead of local state
  const masterTypes = masterProjectTypes && masterProjectTypes.length > 0 ? masterProjectTypes : defaultMasterTypes;

  // Modal States for Project Type
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<MasterProjectType | null>(null);
  const [typeName, setTypeName] = useState('');
  const [typeId, setTypeId] = useState('');
  const [typeColor, setTypeColor] = useState('#8B0000');
  const [typeBadge, setTypeBadge] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [typeStyle, setTypeStyle] = useState<'single' | 'workflow' | 'sla'>('workflow');

  // Save Master Project Types
  const handleSaveTypes = (newTypes: MasterProjectType[]) => {
    if (setMasterProjectTypes) {
      setMasterProjectTypes(newTypes);
    }
  };

  const handleOpenEditType = (t: MasterProjectType) => {
    setEditingType(t);
    setTypeId(t.id);
    setTypeName(t.name);
    setTypeBadge(t.badgeText);
    setTypeColor(t.color);
    setTypeDesc(t.description || '');
    setTypeStyle(t.taskTypeStyle || 'workflow');
    setIsTypeModalOpen(true);
  };

  const handleOpenAddType = () => {
    setEditingType(null);
    setTypeId('type_' + Date.now());
    setTypeName('');
    setTypeBadge('');
    setTypeColor('#8B0000');
    setTypeDesc('');
    setTypeStyle('workflow');
    setIsTypeModalOpen(true);
  };

  const handleSaveTypeModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) return;

    if (editingType) {
      const updated = masterTypes.map(t => t.id === editingType.id ? {
        ...t,
        name: typeName,
        badgeText: typeBadge || typeName,
        color: typeColor,
        description: typeDesc,
        taskTypeStyle: typeStyle
      } : t);
      handleSaveTypes(updated);
    } else {
      const newType: MasterProjectType = {
        id: typeId || 'type_' + Date.now(),
        name: typeName,
        badgeText: typeBadge || typeName,
        color: typeColor,
        iconName: 'Layers',
        description: typeDesc,
        isActive: true,
        taskTypeStyle: typeStyle
      };
      handleSaveTypes([...masterTypes, newType]);
    }
    setIsTypeModalOpen(false);
  };

  const handleToggleActive = (id: string) => {
    const updated = masterTypes.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
    handleSaveTypes(updated);
  };

  const handleDeleteType = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบประเภทโครงการนี้ออกจาก Master?')) {
      const updated = masterTypes.filter(t => t.id !== id);
      handleSaveTypes(updated);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      
      {/* ── HEADER BAR ── */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-gradient" style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Database size={28} color="var(--accent-primary)" />
            Maintain Master (จัดการข้อมูลหลัก)
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>
            ตั้งค่าและจัดกลุ่มประเภทโครงการ 5 กลุ่มหลัก (Quick Service, Install, Renovate, Built-in, MA) พร้อมเทมเพลตและขั้นตอนงานมาตรฐาน
          </p>
        </div>

        <button 
          onClick={handleOpenAddType}
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
            boxShadow: '0 4px 12px rgba(139, 0, 0, 0.25)'
          }}
          className="hover-lift"
        >
          <Plus size={18} /> เพิ่มประเภทโครงการใหม่
        </button>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('project_types')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'project_types' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'project_types' ? 'white' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Layers size={16} /> 1. ประเภทโครงการ (5 กลุ่มหลัก)
        </button>

        <button
          onClick={() => setActiveTab('task_templates')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'task_templates' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'task_templates' ? 'white' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Layers3 size={16} /> 2. Master Task Templates
        </button>

        <button
          onClick={() => setActiveTab('workflow_stages')}
          style={{
            padding: '0.55rem 1.1rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: activeTab === 'workflow_stages' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'workflow_stages' ? 'white' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem'
          }}
        >
          <Sparkles size={16} /> 3. Workflow Stages
        </button>

        <button
          onClick={() => setActiveTab('price_book')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: activeTab === 'price_book' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'price_book' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          <BookOpen size={18} />
          ฐานข้อมูลราคา (Price Book)
        </button>

        <button
          onClick={() => setActiveTab('vq_branches')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: activeTab === 'vq_branches' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'vq_branches' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Database size={18} />
          ข้อมูลสาขา (VQ)
        </button>

        <button
          onClick={() => setActiveTab('vq_zones')}
          style={{
            padding: '0.75rem 1.25rem',
            border: 'none',
            background: activeTab === 'vq_zones' ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === 'vq_zones' ? 'white' : 'var(--text-secondary)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Database size={18} />
          ข้อมูลโซน (VQ)
        </button>
      </div>

      {/* ── TAB 1: MASTER PROJECT TYPES (5 GROUPS) ── */}
      {activeTab === 'project_types' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(139, 0, 0, 0.05)', border: '1px solid rgba(139, 0, 0, 0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.35rem' }}>
              📌 การจัดกลุ่มประเภทโครงการมาตรฐาน (Standard 5 Project Master Types)
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              ระบบกำหนดประเภทโครงการหลักไว้ 5 กลุ่มเพื่อแยกพฤติกรรมของงาน เช่น <strong>Quick Service</strong> (งานด่วนจบใน Task เดี่ยว), <strong>Install</strong> (งานติดตั้ง), <strong>Renovate</strong> (งานปรับปรุงใหญ่ครบวงจร), <strong>Built-in</strong> (งานผลิตเฟอร์นิเจอร์), และ <strong>Maintenance MA</strong> (งานดูแลรายสัญญา)
            </p>
          </div>

          {/* Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {masterTypes.map(t => (
              <div 
                key={t.id} 
                className="glass-panel hover-lift" 
                style={{ 
                  padding: '1.35rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.85rem', 
                  borderLeft: `5px solid ${t.color}`,
                  opacity: t.isActive ? 1 : 0.6
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      {t.name}
                    </h3>
                    <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      ID: {t.id}
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    background: `${t.color}20`,
                    color: t.color,
                    border: `1px solid ${t.color}40`,
                    fontWeight: 700
                  }}>
                    {t.badgeText}
                  </span>
                </div>

                <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: 0, minHeight: '44px', lineHeight: 1.45 }}>
                  {t.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '0.4rem 0.65rem', borderRadius: 'var(--radius-sm)' }}>
                  <span>รูปแบบงาน:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {t.taskTypeStyle === 'single' ? '⚡ Single Task (งานด่วนเดี่ยว)' : t.taskTypeStyle === 'sla' ? '🛡️ SLA / MA Contract' : '🔄 Full Workflow Stages'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    onClick={() => handleToggleActive(t.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: t.isActive ? '#10b981' : 'var(--text-muted)',
                      fontSize: '0.775rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t.isActive ? '🟢 เปิดใช้งาน' : '⚪ ปิดใช้งาน'}
                  </button>

                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={() => handleOpenEditType(t)}
                      style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.775rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Edit size={13} /> แก้ไข
                    </button>
                    <button
                      onClick={() => handleDeleteType(t.id)}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '0.3rem 0.65rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.775rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Trash2 size={13} /> ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 2: MASTER TASK TEMPLATES ── */}
      {activeTab === 'task_templates' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="flex-between">
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                📋 รายการ Master Task Templates ตามประเภทโครงการ
              </h3>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                กำหนดแม่แบบรายการงานอัตโนมัติเมื่อมีการสร้างโครงการในแต่ละประเภท
              </p>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}>ประเภทโครงการ</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>ชื่อแม่แบบงาน (Task Title)</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>ความสำคัญ</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>ระยะเวลาประมาณการ</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {masterTypes.map(mt => {
                  const templatesForType = taskTemplates.filter(tpl => 
                    tpl.projectTemplateName?.toLowerCase().includes(mt.id) ||
                    tpl.projectTemplateName?.toLowerCase().includes(mt.name.toLowerCase())
                  );

                  if (templatesForType.length === 0) {
                    return (
                      <tr key={mt.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 700, color: mt.color }}>{mt.name}</td>
                        <td colSpan={4} style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                          ⚡ แม่แบบงานมาตรฐานอัตโนมัติสำหรับ {mt.name}
                        </td>
                      </tr>
                    );
                  }

                  return templatesForType.map(tpl => (
                    <tr key={tpl.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 700, color: mt.color }}>{mt.name}</td>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tpl.title}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{tpl.priority || 'Medium'}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--accent-warning)', fontWeight: 700 }}>{tpl.estimatedHours || 8} ชม.</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{tpl.description || '-'}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: WORKFLOW STAGES ── */}
      {activeTab === 'workflow_stages' && (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔄 ลำดับขั้นตอนการดำเนินงานมาตรฐาน (Master Workflow Stages)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.35rem 0 0 0' }}>
              ขั้นตอนมาตรฐาน (Standard Workflow Pipelines) สำหรับดำเนินงานแต่ละประเภทโครงการ จำแนกตาม 3 กลุ่มหลัก
            </p>
          </div>

          {/* Quick Summary Cards for 3 Standard Pipelines */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Zap size={16} /> Quick Service Flow
                </span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.2)', color: '#d97706', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>8 ขั้นตอน</span>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                สำหรับงานบริการด่วนและแก้ไขซ่อมแซมเร่งด่วน โดยข้ามขั้นตอนสำรวจและออกแบบ
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', lineHeight: 1.6, wordBreak: 'break-word' }}>
                To Do ➔ ชำระเงิน ➔ Assign ช่าง ➔ Check-in ➔ Check-out ➔ QC ➔ Aftersale ➔ Close
              </div>
            </div>

            <div style={{ background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Wrench size={16} /> Installer &amp; MA Flow
                </span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(37, 99, 235, 0.2)', color: '#2563eb', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>10 ขั้นตอน</span>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                สำหรับงานติดตั้งอุปกรณ์และสัญญาซ่อมบำรุง MA มีขั้นตอนซื้อสำรวจและสำรวจหน้างาน
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', lineHeight: 1.6, wordBreak: 'break-word' }}>
                To Do ➔ Buy-Survey ➔ Survey ➔ ชำระเงิน ➔ Assign ช่าง ➔ Check-in ➔ Check-out ➔ QC ➔ Aftersale ➔ Close
              </div>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: '#8b5cf6', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Home size={16} /> Renovate, Build-In &amp; New House
                </span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(139, 92, 246, 0.2)', color: '#8b5cf6', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 600 }}>11 ขั้นตอน</span>
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', margin: 0 }}>
                สำหรับงานรีโนเวท บิวท์อิน และสร้างบ้านใหม่ มีกระบวนการสำรวจ ออกแบบ 3D และก่อสร้างครบวงจร
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '6px', lineHeight: 1.6, wordBreak: 'break-word' }}>
                To Do ➔ Buy-Survey ➔ Survey ➔ Design ➔ ชำระเงิน ➔ Assign ช่าง ➔ Check-in ➔ Check-out ➔ QC ➔ Aftersale ➔ Close
              </div>
            </div>
          </div>

          {/* Project Type Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              📋 รายละเอียดขั้นตอนจำแนกตามประเภทโครงการ ({masterTypes.length} หมวดหมู่)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {masterTypes.map(mt => {
                const stages = getWorkflowStagesForType(mt.id);
                return (
                  <div key={mt.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.25rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: mt.color }} />
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{mt.name}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--bg-secondary)', color: mt.color, fontWeight: 700, border: `1px solid ${mt.color}40` }}>
                        {stages.length} ขั้นตอน
                      </span>
                    </div>

                    <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
                      {mt.description}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
                      {stages.map((stg, idx) => (
                        <div 
                          key={stg.key} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '0.45rem 0.65rem', 
                            background: 'var(--bg-secondary)', 
                            borderRadius: '6px',
                            borderLeft: `3px solid ${stg.color}`
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', width: '18px' }}>
                              {idx + 1}.
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: stg.color }}>
                              {stg.title}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '50%', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {stg.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PRICE BOOK ── */}
      {activeTab === 'price_book' && (
        <PriceBookManager priceBook={priceBook} setPriceBook={setPriceBook!} />
      )}

      {/* ── TAB 5: VQ BRANCHES (READ ONLY) ── */}
      {activeTab === 'vq_branches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>ข้อมูลสาขา (เชื่อมต่อจากระบบ VQ)</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ข้อมูลสำหรับใช้แบบอ่านอย่างเดียว เพื่อให้อ้างอิงสาขาตรงกับระบบบริหารช่าง VQ</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>รหัส</th>
                  <th>ชื่อสาขา</th>
                  <th>จังหวัด</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {masterBranches.length > 0 ? masterBranches.map(b => (
                  <tr key={b.id}>
                    <td><span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>{b.code}</span></td>
                    <td style={{ fontWeight: 600 }}>{b.name}</td>
                    <td>{b.province}</td>
                    <td>
                      <span className="badge" style={{ background: b.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: b.status === 'Active' ? '#10b981' : '#ef4444' }}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>ไม่มีข้อมูลสาขา</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 6: VQ ZONES (READ ONLY) ── */}
      {activeTab === 'vq_zones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>ข้อมูลโซนพื้นที่ (เชื่อมต่อจากระบบ VQ)</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>รวบรวมโซนพื้นที่ทั้งหมดที่ช่างในระบบ VQ รับผิดชอบ (ข้อมูลอ่านอย่างเดียว)</p>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ชื่อโซนพื้นที่ (Zone Name)</th>
                </tr>
              </thead>
              <tbody>
                {masterZones.length > 0 ? masterZones.map(z => (
                  <tr key={z.id}>
                    <td style={{ fontWeight: 600 }}>{z.name}</td>
                  </tr>
                )) : (
                  <tr><td style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>ไม่มีข้อมูลโซนพื้นที่</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD / EDIT MASTER PROJECT TYPE ── */}
      {isTypeModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '520px', width: '100%', border: '1px solid rgba(255,255,255,0.12)' }}>
            
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: 'var(--text-primary)' }}>
              {editingType ? '✏️ แก้ไขประเภทโครงการ Master' : '➕ เพิ่มประเภทโครงการใหม่'}
            </h3>

            <form onSubmit={handleSaveTypeModal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  ชื่อประเภทโครงการ <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input 
                  type="text" 
                  value={typeName}
                  onChange={e => setTypeName(e.target.value)}
                  placeholder="เช่น Quick Service, Install, Renovate"
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ข้อความป้ายกำกับ (Badge)</label>
                  <input 
                    type="text" 
                    value={typeBadge}
                    onChange={e => setTypeBadge(e.target.value)}
                    placeholder="เช่น Quick Service ⚡"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>สีประเภท (Theme Color)</label>
                  <input 
                    type="color" 
                    value={typeColor}
                    onChange={e => setTypeColor(e.target.value)}
                    style={{ width: '100%', height: '42px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--bg-tertiary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>รูปแบบประเภทงาน (Work Style)</label>
                <select
                  value={typeStyle}
                  onChange={e => setTypeStyle(e.target.value as any)}
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                >
                  <option value="workflow">🔄 Full Workflow Stages (งานหลายขั้นตอน)</option>
                  <option value="single">⚡ Single Quick Task (งานด่วนเดี่ยว จบไว)</option>
                  <option value="sla">🛡️ SLA / Maintenance Contract (ซ่อมบำรุงรายสัญญา)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', fontWeight: 600 }}>คำอธิบายโครงการ</label>
                <textarea 
                  value={typeDesc}
                  onChange={e => setTypeDesc(e.target.value)}
                  rows={3}
                  placeholder="คำอธิบายรายละเอียดลักษณะงาน..."
                  style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', color: 'var(--text-primary)', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTypeModalOpen(false)}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '0.55rem 1.1rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 700 }}
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
