import React, { useState, useRef } from 'react';
import { 
  FileText, Upload, Sparkles, Plus, Trash2, CheckCircle2, 
  ArrowRight, RefreshCw, X, AlertCircle, Layers, Hammer, 
  Zap, Droplets, Grid, Paintbrush, Bath, Wind, DoorOpen, 
  Boxes, Wrench, FileSpreadsheet, FileImage
} from 'lucide-react';
import type { Project, User } from '../types';
import { CustomDateInput } from './CustomDateInput';

export interface ScannedBoqItem {
  id: string;
  service_name: string;
  quantity: number;
  unit_type: string;
  unit_price: number;
  total_price: number;
  trade: string;
  trade_color?: string;
  estimated_hours: number;
}

interface QuotationScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: User | null;
  projects?: Project[];
  leads?: any[];
  onSuccess?: () => void;
  defaultProjectId?: string;
}

const getAuthHeaders = (currentUser?: User | null) => {
  let userId = currentUser?.id || '';
  if (!userId && typeof window !== 'undefined') {
    try {
      const u = JSON.parse(localStorage.getItem('nt_current_user') || '{}');
      userId = u?.id || localStorage.getItem('userId') || '';
    } catch {
      userId = localStorage.getItem('userId') || '';
    }
  }
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'X-User-Id': userId
  };
};

const TRADE_OPTIONS = [
  { trade: 'งานรื้อถอน', color: '#ef4444' },
  { trade: 'งานไฟฟ้า', color: '#f59e0b' },
  { trade: 'งานประปา', color: '#3b82f6' },
  { trade: 'งานฝ้าเพดาน', color: '#8b5cf6' },
  { trade: 'งานปูกระเบื้อง', color: '#06b6d4' },
  { trade: 'งานทาสี', color: '#ec4899' },
  { trade: 'งานสุขภัณฑ์', color: '#10b981' },
  { trade: 'งานแอร์', color: '#0284c7' },
  { trade: 'งานประตูหน้าต่าง', color: '#d97706' },
  { trade: 'งานบิวท์อิน', color: '#7c3aed' },
  { trade: 'งานติดตั้งทั่วไป', color: '#6b7280' }
];

export const QuotationScanModal: React.FC<QuotationScanModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  projects = [],
  leads = [],
  onSuccess,
  defaultProjectId
}) => {
  const [activeTab, setActiveTab] = useState<'file' | 'paste'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [pastedText, setPastedText] = useState<string>('');
  
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [scanStep, setScanStep] = useState<'upload' | 'review'>('upload');

  // Parsed Form States
  const [quotationNumber, setQuotationNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<ScannedBoqItem[]>([]);
  
  // Destination Options
  const [saveAsQuotation, setSaveAsQuotation] = useState(true);
  const [saveAsWbs, setSaveAsWbs] = useState(true);
  const [internalProjects, setInternalProjects] = useState<any[]>(projects || []);
  const [targetProjectId, setTargetProjectId] = useState<string>(defaultProjectId || '__NEW_PROJECT__');
  const [replaceExistingTasks, setReplaceExistingTasks] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      fetch('/api/projects', { headers: getAuthHeaders(currentUser) })
        .then(r => r.json())
        .then(d => {
          const list = Array.isArray(d) ? d : (d.data || []);
          setInternalProjects(list);
          if (defaultProjectId) {
            setTargetProjectId(defaultProjectId);
          } else if (!targetProjectId || targetProjectId === '') {
            setTargetProjectId(list.length > 0 ? list[0].id : '__NEW_PROJECT__');
          }
        })
        .catch(err => console.error('Fetch projects error:', err));
    }
  }, [isOpen, defaultProjectId, currentUser]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = () => {
        setFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOneClickDemoScan = () => {
    setQuotationNumber('QT-202608-009');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setCustomerName('คุณจงใจ มานิด');
    setCustomerPhone('0819876543');
    setCustomerAddress('88/12 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กรุงเทพฯ 10260');
    setItems([
      { id: 'item_1', service_name: 'งานเตรียมพื้นที่ กั้นโซนพลาสติกป้องกันฝุ่น ปูแผ่นกันรอยพื้น', quantity: 1, unit_type: 'งาน', unit_price: 3500, total_price: 3500, trade: 'งานรื้อถอน', trade_color: '#ef4444', estimated_hours: 8 },
      { id: 'item_2', service_name: 'งานรื้อถอนกระเบื้องเดิม สุขภัณฑ์เดิม และขนย้ายเศษวัสดุไปทิ้ง', quantity: 1, unit_type: 'งาน', unit_price: 6500, total_price: 6500, trade: 'งานรื้อถอน', trade_color: '#ef4444', estimated_hours: 16 },
      { id: 'item_3', service_name: 'งานเดินท่อน้ำดี PPR และท่อน้ำทิ้ง PVC พร้อมทดสอบแรงดันน้ำ', quantity: 3, unit_type: 'จุด', unit_price: 1200, total_price: 3600, trade: 'งานประปา', trade_color: '#3b82f6', estimated_hours: 12 },
      { id: 'item_4', service_name: 'งานกรีดผนังร้อยท่อสายไฟเมน ติดตั้งเต้ารับ ปลั๊ก และสวิตช์', quantity: 8, unit_type: 'จุด', unit_price: 550, total_price: 4400, trade: 'งานไฟฟ้า', trade_color: '#f59e0b', estimated_hours: 16 },
      { id: 'item_5', service_name: 'งานติดตั้งโครงคร่าว C-Line และแผ่นฝ้าเพดานยิปซัมกันชื้น', quantity: 25, unit_type: 'ตร.ม.', unit_price: 380, total_price: 9500, trade: 'งานฝ้าเพดาน', trade_color: '#8b5cf6', estimated_hours: 16 },
      { id: 'item_6', service_name: 'งานเทปูนปรับระดับพื้น ทากันซึม และปูกระเบื้องพื้นผนังพร้อมยาแนว', quantity: 40, unit_type: 'ตร.ม.', unit_price: 450, total_price: 18000, trade: 'งานปูกระเบื้อง', trade_color: '#06b6d4', estimated_hours: 24 },
      { id: 'item_7', service_name: 'งานฉาบสกิมโค้ท ทาสีรองพื้นปูนเก่า และทาสีจริงกึ่งเงา 2 เที่ยว', quantity: 55, unit_type: 'ตร.ม.', unit_price: 160, total_price: 8800, trade: 'งานทาสี', trade_color: '#ec4899', estimated_hours: 16 },
      { id: 'item_8', service_name: 'งานติดตั้งสุขภัณฑ์ห้องน้ำ ชักโครก อ่างล้างหน้า ฝักบัว และฉากกั้น', quantity: 1, unit_type: 'ชุด', unit_price: 4500, total_price: 4500, trade: 'งานสุขภัณฑ์', trade_color: '#10b981', estimated_hours: 8 },
      { id: 'item_9', service_name: 'งานติดตั้งโคมไฟดาวน์ไลท์ LED และพัดลมระบายอากาศ', quantity: 6, unit_type: 'ชุด', unit_price: 650, total_price: 3900, trade: 'งานไฟฟ้า', trade_color: '#f59e0b', estimated_hours: 6 },
      { id: 'item_10', service_name: 'งานทำความสะอาด Deep Clean เคลียร์พื้นที่ และตรวจรับส่งมอบ', quantity: 1, unit_type: 'งาน', unit_price: 2000, total_price: 2000, trade: 'งานติดตั้งทั่วไป', trade_color: '#6b7280', estimated_hours: 6 }
    ]);
    setScanStep('review');
  };

  const loadSampleData = () => {
    const sample = `เลขที่เอกสาร: QT-202608-009
วันที่: 28/08/2026
ลูกค้า: คุณจงใจ มานิด
เบอร์โทร: 081-987-6543
สถานที่ติดตั้ง: 88/12 ซอยสุขุมวิท 101/1 แขวงบางจาก เขตพระโขนง กทม.

รายการงานและรายละเอียด BOQ:
1. งานเตรียมพื้นที่ กั้นโซนพลาสติกป้องกันฝุ่น ปูแผ่นกันรอยพื้น	1	งาน	3,500	3,500
2. งานรื้อถอนกระเบื้องและสุขภัณฑ์เดิม พร้อมขนเศษทิ้ง	1	งาน	6,500	6,500
3. งานเดินท่อน้ำดี PPR และท่อน้ำทิ้ง PVC ใหม่	3	จุด	1,200	3,600
4. งานเดินสายไฟเมน ร้อยท่อ ติดตั้งเต้ารับและสวิตช์	8	จุด	550	4,400
5. งานติดตั้งโครงคร่าว C-Line และฝ้าเพดานกันชื้น	25	ตร.ม.	380	9,500
6. งานปูกระเบื้องพื้นและผนังห้องน้ำ พร้อมยาแนว	40	ตร.ม.	450	18,000
7. งานทาสีรองพื้นปูนเก่าและทาสีจริงกึ่งเงา	55	ตร.ม.	160	8,800
8. งานติดตั้งสุขภัณฑ์ ชักโครก อ่างล้างหน้า ฝักบัว	1	ชุด	4,500	4,500
9. งานติดตั้งโคมไฟดาวน์ไลท์ LED และพัดลมดูดอากาศ	6	ชุด	650	3,900
10. งานทำความสะอาดเคลียร์พื้นที่ และตรวจรับส่งมอบ	1	งาน	2,000	2,000

ยอดรวมทั้งสิ้น: 64,700 บาท`;
    setPastedText(sample);
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    try {
      let payload: any = {};
      if (activeTab === 'paste') {
        if (!pastedText.trim()) {
          alert('กรุณาวางข้อความรายละเอียดใบเสนอราคาหรือ BOQ');
          setIsScanning(false);
          return;
        }
        payload = { text: pastedText };
      } else {
        if (!selectedFile || !fileBase64) {
          alert('กรุณาเลือกไฟล์เอกสารใบเสนอราคา (PDF / รูปภาพ / Excel / CSV)');
          setIsScanning(false);
          return;
        }
        payload = {
          fileData: fileBase64,
          fileType: selectedFile.name.split('.').pop()?.toLowerCase() || 'txt',
          fileName: selectedFile.name
        };
      }

      const res = await fetch('/api/quotations/scan-boq', {
        method: 'POST',
        headers: getAuthHeaders(currentUser),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('การสแกนเอกสารไม่สำเร็จ');
      }

      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setQuotationNumber(d.quotation_number || `QT-${Date.now().toString().slice(-6)}`);
        setIssueDate(d.issue_date || new Date().toISOString().split('T')[0]);
        setCustomerName(d.customer_name || '');
        setCustomerPhone(d.customer_phone || '');
        setCustomerAddress(d.customer_address || '');
        setItems(d.items || []);
        setScanStep('review');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      alert('เกิดข้อผิดพลาดในการสแกน: ' + (err.message || err));
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddItem = () => {
    const newItem: ScannedBoqItem = {
      id: `item_${Date.now()}`,
      service_name: 'งานเพิ่มเติม',
      quantity: 1,
      unit_type: 'งาน',
      unit_price: 1000,
      total_price: 1000,
      trade: 'งานติดตั้งทั่วไป',
      trade_color: '#6b7280',
      estimated_hours: 4
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, field: keyof ScannedBoqItem, value: any) => {
    const updated = [...items];
    const it = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const q = parseFloat(it.quantity as any) || 0;
      const p = parseFloat(it.unit_price as any) || 0;
      it.total_price = q * p;
    }
    if (field === 'trade') {
      const found = TRADE_OPTIONS.find(t => t.trade === value);
      if (found) it.trade_color = found.color;
    }

    updated[index] = it;
    setItems(updated);
  };

  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSaveAndGenerate = async () => {
    if (items.length === 0) {
      alert('กรุณามีรายการงานอย่างน้อย 1 รายการ');
      return;
    }
    if (!saveAsQuotation && !saveAsWbs) {
      alert('กรุณาเลือกอย่างน้อย 1 ปลายทาง (บันทึกเป็นใบเสนอราคา หรือ แปลงเป็น WBS ในโครงการ)');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Save as Quotation if checked
      if (saveAsQuotation) {
        const quoPayload = {
          quotation_number: quotationNumber,
          issue_date: issueDate,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          vat_type: 'Exclude VAT',
          items: items.map(it => ({
            service_name: it.service_name,
            quantity: it.quantity,
            unit_type: it.unit_type,
            unit_price: it.unit_price,
            total_price: it.total_price,
            unit_cost: it.unit_price * 0.7
          })),
          notes: `นำเข้าจากการสแกน BOQ (${items.length} รายการ) เมื่อ ${new Date().toLocaleDateString('th-TH')}`
        };

        const quoRes = await fetch('/api/quotations', {
          method: 'POST',
          headers: getAuthHeaders(currentUser),
          body: JSON.stringify(quoPayload)
        });

        if (!quoRes.ok) {
          console.warn('Could not save quotation record');
        }
      }

      // 2. Import into Project WBS if checked
      if (saveAsWbs) {
        let finalProjectId = targetProjectId;

        if (!finalProjectId || finalProjectId === '__NEW_PROJECT__') {
          // Auto create project
          const projName = customerName ? `[Renovate Service] ${customerName}` : `[Renovate Service] โครงการใหม่ (${quotationNumber})`;
          const today = new Date().toISOString().split('T')[0];
          const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

          const createRes = await fetch('/api/projects', {
            method: 'POST',
            headers: getAuthHeaders(currentUser),
            body: JSON.stringify({
              name: projName,
              description: `โครงการที่สร้างจากการสแกนใบเสนอราคา ${quotationNumber} (${customerName || 'ลูกค้า'})`,
              projectType: 'Renovate Service',
              status: 'In Progress',
              priority: 'High',
              startDate: today,
              endDate: nextMonth,
              address: customerAddress || '',
              budget: grandTotal,
              projectValue: grandTotal
            })
          });

          if (!createRes.ok) {
            const errD = await createRes.json().catch(() => ({}));
            throw new Error(errD.error || 'ไม่สามารถสร้างโครงการใหม่ได้');
          }
          const newProj = await createRes.json();
          finalProjectId = newProj.id;
        }

        const wbsRes = await fetch(`/api/quotations/import-boq-wbs/${finalProjectId}`, {
          method: 'POST',
          headers: getAuthHeaders(currentUser),
          body: JSON.stringify({
            items,
            replaceExisting: replaceExistingTasks
          })
        });

        if (!wbsRes.ok) {
          const errData = await wbsRes.json().catch(() => ({}));
          throw new Error(errData.error || 'ไม่สามารถนำเข้า WBS ได้');
        }
      }

      alert(`✅ ประมวลผลสำเร็จ!\n- บันทึกรายการ BOQ: ${items.length} รายการ\n${saveAsWbs ? '- แปลงเป็น WBS Tasks ในโครงการเรียบร้อยแล้ว' : ''}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving BOQ:', err);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const grandTotal = items.reduce((s, it) => s + (Number(it.total_price) || 0), 0);
  const totalEstHours = items.reduce((s, it) => s + (Number(it.estimated_hours) || 0), 0);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1300,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: scanStep === 'upload' ? '680px' : '1050px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        transition: 'max-width 0.3s ease'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <Sparkles size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {scanStep === 'upload' ? '📤 อัปโหลด & สแกนใบเสนอราคา (Smart BOQ Scanner)' : '📋 ตรวจสอบรายการงาน & แปลงเป็น WBS'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {scanStep === 'upload' ? 'รองรับไฟล์ PDF, รูปถ่ายใบเสนอราคา, Excel, หรือวางข้อความตาราง' : `พบ ${items.length} รายการงาน | พร้อมจำแนกหมวดช่างและสร้าง WBS อัตโนมัติ`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {scanStep === 'upload' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: activeTab === 'file' ? '#3b82f6' : 'transparent',
                    color: activeTab === 'file' ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Upload size={16} /> อัปโหลดไฟล์ (PDF / ภาพ / Excel / CSV)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: activeTab === 'paste' ? '#3b82f6' : 'transparent',
                    color: activeTab === 'paste' ? 'white' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <FileText size={16} /> วางข้อความตาราง (Paste Text)
                </button>
              </div>

              {activeTab === 'file' ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.csv,.txt"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '2.5rem 1.5rem',
                      textAlign: 'center',
                      background: selectedFile ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-tertiary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderColor: selectedFile ? '#3b82f6' : 'var(--border-color)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px' }}><FileText size={28} /></div>
                      <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px' }}><FileSpreadsheet size={28} /></div>
                      <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px' }}><FileImage size={28} /></div>
                    </div>
                    {selectedFile ? (
                      <div>
                        <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: '1rem' }}>📄 {selectedFile.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          ขนาด {(selectedFile.size / 1024).toFixed(1)} KB | คลิกเพื่อเปลี่ยนไฟล์
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                          รองรับ PDF, รูปถ่ายใบเสนอราคา (JPG/PNG), และ Excel/CSV
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      วางข้อความรายละเอียดใบเสนอราคา / ตาราง BOQ:
                    </label>
                    <button
                      type="button"
                      onClick={loadSampleData}
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        color: '#3b82f6',
                        borderRadius: '4px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ⚡ โหลดตัวอย่าง BOQ รีโนเวท
                    </button>
                  </div>
                  <textarea
                    rows={10}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="วางข้อความจากใบเสนอราคา หรือก๊อปปี้ตารางจาก Excel มาวางที่นี่..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                      lineHeight: 1.5
                    }}
                  />
                </div>
              )}

              {/* Sample Files Download & Instant Demo Bar */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    📥 ตัวอย่างเอกสาร BOQ สำหรับทดลองระบบ (Sample Files):
                  </span>
                  <button
                    type="button"
                    onClick={handleOneClickDemoScan}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                    }}
                    className="hover-lift"
                  >
                    <Sparkles size={14} /> ⚡ 1-Click Demo (สแกนตัวอย่างทันที)
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <a
                    href="/samples/sample_boq_renovate.csv"
                    download="sample_boq_renovate.csv"
                    style={{
                      textDecoration: 'none',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: '#10b981',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer'
                    }}
                  >
                    <FileSpreadsheet size={15} /> 📊 ดาวน์โหลดไฟล์ตัวอย่าง CSV (Excel)
                  </a>
                  <a
                    href="/samples/sample_boq_renovate.txt"
                    download="sample_boq_renovate.txt"
                    style={{
                      textDecoration: 'none',
                      background: 'rgba(59, 130, 246, 0.12)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#3b82f6',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      cursor: 'pointer'
                    }}
                  >
                    <FileText size={15} /> 📄 ดาวน์โหลดไฟล์ตัวอย่าง TXT (Text)
                  </a>
                </div>
              </div>

              {/* Supported Trades Preview */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  🎯 ระบบตรวจจับและแยกหมวดช่างอัตโนมัติ (Auto Trade Categorization):
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {TRADE_OPTIONS.map(t => (
                    <span
                      key={t.trade}
                      style={{
                        fontSize: '0.72rem',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '4px',
                        background: `${t.color}15`,
                        color: t.color,
                        fontWeight: 600,
                        border: `1px solid ${t.color}30`
                      }}
                    >
                      #{t.trade}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Review & Edit Screen */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Header Info Panel */}
              <div style={{
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-color)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '0.75rem'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    เลขที่ใบเสนอราคา
                  </label>
                  <input
                    type="text"
                    value={quotationNumber}
                    onChange={e => setQuotationNumber(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    วันที่ออกเอกสาร
                  </label>
                  <CustomDateInput
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    ชื่อลูกค้า
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="เช่น คุณจงใจ มานิด"
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    เบอร์โทรติดต่อ
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="เช่น 0812345678"
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                    สถานที่ติดตั้ง / ที่อยู่หน้างาน
                  </label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="ระบุที่อยู่หรือโครงการติดตั้ง"
                    style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Target Destination & WBS Integration Options */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={18} color="#10b981" /> การบันทึกและแปลงข้อมูลสู่ระบบ (Target Actions)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={saveAsQuotation}
                      onChange={e => setSaveAsQuotation(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#10b981' }}
                    />
                    💾 บันทึกเป็นใบเสนอราคา (Quotation & BOQ)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={saveAsWbs}
                      onChange={e => setSaveAsWbs(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                    />
                    🚀 แปลงเป็น WBS Tasks ในโครงการ (Project Plan / Gantt)
                  </label>
                </div>

                {saveAsWbs && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem', background: 'var(--bg-secondary)', padding: '0.65rem 0.85rem', borderRadius: '6px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                        เลือกโครงการที่จะนำเข้า Tasks:
                      </label>
                      <select
                        value={targetProjectId}
                        onChange={e => setTargetProjectId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          fontWeight: 600
                        }}
                      >
                        <option value="__NEW_PROJECT__" style={{ color: '#10b981', fontWeight: 700 }}>
                          ✨ + สร้างเป็นโครงการใหม่ทันที (Auto-create New Project)
                        </option>
                        {internalProjects.map(p => (
                          <option key={p.id} value={p.id}>
                            🏢 {p.name} ({p.projectType || 'Renovate'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)', alignSelf: 'flex-end', paddingBottom: '0.4rem' }}>
                      <input
                        type="checkbox"
                        checked={replaceExistingTasks}
                        onChange={e => setReplaceExistingTasks(e.target.checked)}
                        style={{ accentColor: '#ef4444' }}
                      />
                      แทนที่ Tasks เดิมในโครงการ
                    </label>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    🛠️ รายการงานที่สแกนได้ ({items.length} รายการ)
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.3rem 0.75rem',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Plus size={14} /> เพิ่มรายการงาน
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                      <tr>
                        <th style={{ padding: '0.6rem 0.5rem', width: '35px', textAlign: 'center' }}>#</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '140px' }}>หมวดช่าง (Trade)</th>
                        <th style={{ padding: '0.6rem 0.5rem' }}>รายการงาน / รายละเอียด</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '70px' }}>จำนวน</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '80px' }}>หน่วย</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '90px' }}>ราคา/หน่วย</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '95px' }}>รวม (บาท)</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '75px' }}>ชม. (Est)</th>
                        <th style={{ padding: '0.6rem 0.5rem', width: '40px', textAlign: 'center' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--border-color)', background: idx % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)' }}>
                          <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                          <td style={{ padding: '0.45rem 0.5rem' }}>
                            <select
                              value={it.trade}
                              onChange={e => handleUpdateItem(idx, 'trade', e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.25rem 0.35rem',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: it.trade_color || '#3b82f6',
                                fontWeight: 700,
                                fontSize: '0.75rem'
                              }}
                            >
                              {TRADE_OPTIONS.map(to => (
                                <option key={to.trade} value={to.trade}>{to.trade}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem' }}>
                            <input
                              type="text"
                              value={it.service_name}
                              onChange={e => handleUpdateItem(idx, 'service_name', e.target.value)}
                              style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem' }}>
                            <input
                              type="number"
                              value={it.quantity}
                              onChange={e => handleUpdateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem' }}>
                            <input
                              type="text"
                              value={it.unit_type}
                              onChange={e => handleUpdateItem(idx, 'unit_type', e.target.value)}
                              style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem' }}>
                            <input
                              type="number"
                              value={it.unit_price}
                              onChange={e => handleUpdateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                            {(it.total_price || 0).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem' }}>
                            <input
                              type="number"
                              value={it.estimated_hours}
                              onChange={e => handleUpdateItem(idx, 'estimated_hours', parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '0.25rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.2rem' }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Row */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '1.5rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  marginTop: '0.5rem',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    รวมชั่วโมงประมาณการ: <strong style={{ color: '#f59e0b' }}>{totalEstHours} ชม.</strong>
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    ยอดรวมทั้งสิ้น (Grand Total): <span style={{ color: '#10b981', fontSize: '1.1rem' }}>{grandTotal.toLocaleString()} บาท</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-tertiary)'
        }}>
          {scanStep === 'upload' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleStartScan}
                disabled={isScanning || (activeTab === 'file' && !selectedFile) || (activeTab === 'paste' && !pastedText.trim())}
                style={{
                  padding: '0.55rem 1.5rem',
                  borderRadius: 'var(--radius-md)',
                  background: isScanning ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none',
                  cursor: isScanning ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                {isScanning ? (
                  <><RefreshCw size={16} className="spin-slow" /> กำลังสแกนเอกสาร...</>
                ) : (
                  <><Sparkles size={16} /> เริ่มสแกนเอกสาร (Scan BOQ)</>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setScanStep('upload')}
                style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
              >
                ⬅️ ย้อนกลับไปสแกนใหม่
              </button>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ padding: '0.55rem 1.25rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="button"
                  onClick={handleSaveAndGenerate}
                  disabled={isSaving || items.length === 0}
                  style={{
                    padding: '0.55rem 1.5rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSaving ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  {isSaving ? (
                    <><RefreshCw size={16} className="spin-slow" /> กำลังบันทึกข้อมูล...</>
                  ) : (
                    <><CheckCircle2 size={16} /> ยืนยันบันทึก & สร้าง WBS โครงการ</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
