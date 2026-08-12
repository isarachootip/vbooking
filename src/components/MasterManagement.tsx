import React, { useState } from 'react';
import type { TaskTemplate, User, MasterProjectType, ServicePriceItem } from '../types';
import { Layers, Plus, Trash2, Edit, Database, Layers3, Sparkles, BookOpen } from 'lucide-react';
import { PriceBookManager } from './PriceBookManager';

interface MasterManagementProps {
  taskTemplates: TaskTemplate[];
  setTaskTemplates?: React.Dispatch<React.SetStateAction<TaskTemplate[]>>;
  masterProjectTypes: MasterProjectType[];
  setMasterProjectTypes?: (types: MasterProjectType[]) => void;
  priceBook?: ServicePriceItem[];
  setPriceBook?: (pb: ServicePriceItem[]) => void;
  currentUser: User | null;
  fetchInitialData?: () => void;
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
  currentUser: _currentUser
}: MasterManagementProps) => {
  const [activeTab, setActiveTab] = useState<'project_types' | 'task_templates' | 'workflow_stages' | 'price_book'>('project_types');

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
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              🔄 ลำดับขั้นตอนการดำเนินงาน (Master Workflow Stages)
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
              ขั้นตอนมาตรฐานในการดำเนินโครงการแต่ละประเภท
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {masterTypes.map(mt => (
              <div key={mt.id} style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '1.15rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: mt.color }}>
                  {mt.name}
                </div>
                {mt.taskTypeStyle === 'single' ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.65rem', borderRadius: 'var(--radius-sm)' }}>
                    ⚡ <strong>Quick Service Flow:</strong> แจ้งงานด่วน ➔ ดำเนินการ ➔ ส่งมอบงาน (ไม่มีขั้นตอนซับซ้อน)
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.775rem' }}>
                    <div style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>1. ซื้อสำรวจ (Survey Request)</div>
                    <div style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>2. QC (สำรวจหน้างาน)</div>
                    <div style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>3. ออกแบบ &amp; ใบเสนอราคา</div>
                    <div style={{ padding: '0.35rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px' }}>4. ลูกค้ายืนยัน / ชำระเงิน</div>
                    <div style={{ padding: '0.35rem 0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700, borderRadius: '4px' }}>5. ส่งมอบงานเสร็จสมบูรณ์</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: PRICE BOOK ── */}
      {activeTab === 'price_book' && (
        <PriceBookManager priceBook={priceBook} setPriceBook={setPriceBook!} />
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
