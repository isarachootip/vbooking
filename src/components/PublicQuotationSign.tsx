import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  FileText, CheckCircle2, Printer, ShieldCheck, 
  MapPin, Phone, Building, Layers, Sparkles, Check, AlertCircle, RefreshCw, Download
} from 'lucide-react';
import { formatToDDMMYYYY } from '../utils';

export const PublicQuotationSign: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Signing States
  const [signerName, setSignerName] = useState('');
  const [signerPhone, setSignerPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSignSuccess, setIsSignSuccess] = useState(false);
  
  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const fetchQuotation = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/quotations/public/${id}`);
      if (res.ok) {
        const data = await res.json();
        setQuotation(data.quotation);
        setItems(data.items || []);
        setCompanyInfo(data.companyInfo);
        if (data.quotation?.customer_name && !signerName) {
          setSignerName(data.quotation.customer_name);
        }
        if (data.quotation?.customer_phone && !signerPhone) {
          setSignerPhone(data.quotation.customer_phone);
        }
        if (data.quotation?.status === 'Accepted' || data.quotation?.customer_signature) {
          setIsSignSuccess(true);
        }
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'ไม่พบเอกสารใบเสนอราคา');
      }
    } catch (err) {
      console.error('Failed to fetch public quotation:', err);
      setErrorMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotation();
  }, [id]);

  // Setup Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e3a8a';
  }, [quotation, isSignSuccess]);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleConfirmSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSignature) {
      alert('กรุณาวาดลายเซ็นต์ลงในช่องลายเซ็นต์ด้านล่าง');
      return;
    }
    if (!signerName.trim()) {
      alert('กรุณากรอกชื่อ-นามสกุล ผู้มีอำนาจลงนาม');
      return;
    }
    if (!agreed) {
      alert('กรุณาทำเครื่องหมายยินยอมรับข้อกำหนดและเงื่อนไข');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureBase64 = canvas.toDataURL('image/png');

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/quotations/public/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: signatureBase64,
          signed_by_name: signerName.trim(),
          signed_phone: signerPhone.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setIsSignSuccess(true);
        if (data.quotation) {
          setQuotation(data.quotation);
        }
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกลายเซ็นต์');
      }
    } catch (err) {
      console.error('Sign error:', err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <RefreshCw size={32} className="spin-animation" style={{ color: '#2563eb' }} />
        <div style={{ color: '#475569', fontWeight: 600 }}>กำลังโหลดเอกสารใบเสนอราคา...</div>
      </div>
    );
  }

  if (errorMessage || !quotation) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '2.5rem', maxWidth: '460px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <AlertCircle size={48} style={{ color: '#ef4444', margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#0f172a', margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 800 }}>ไม่พบเอกสาร</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{errorMessage || 'เอกสารใบเสนอราคานี้อาจถูกลบหรือลิงก์ไม่ถูกต้อง'}</p>
        </div>
      </div>
    );
  }

  const isAlreadySigned = isSignSuccess || quotation.status === 'Accepted' || Boolean(quotation.customer_signature);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '1.5rem 1rem', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* Top Floating Status Banner */}
        {isAlreadySigned ? (
          <div style={{
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#ffffff',
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.25)',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>เอกสารนี้ได้รับการลงนามอนุมัติสั่งจ้างเรียบร้อยแล้ว</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
                  ลงนามโดย {quotation.customer_signed_name || signerName || quotation.customer_name} เมื่อ {formatToDDMMYYYY(quotation.customer_signed_at || new Date().toISOString())}
                </div>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: '#ffffff',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={14} /> พิมพ์ / บันทึก PDF
            </button>
          </div>
        ) : (
          <div style={{
            background: '#ffffff',
            border: '1px solid #bfdbfe',
            borderLeft: '5px solid #2563eb',
            padding: '0.85rem 1.25rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={20} color="#2563eb" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>
                ใบเสนอราคาทางการสำหรับการพิจารณาและลงนามอนุมัติสั่งจ้างออนไลน์
              </span>
            </div>
            <button
              onClick={() => window.print()}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Printer size={13} /> พิมพ์
            </button>
          </div>
        )}

        {/* OFFICIAL QUOTATION PAPER CONTAINER */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '2.5rem 2.25rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0',
          color: '#0f172a'
        }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.25rem', letterSpacing: '-0.02em' }}>
                {companyInfo?.companyName || 'PMT DESIGN & RENOVATION'}
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: '1.5' }}>
                <div>{companyInfo?.subTitle || 'บริษัท พีเอ็มที บิลด์โฟลว์ แมเนจเม้นท์ จำกัด'}</div>
                <div>เลขประจำตัวผู้เสียภาษี: {companyInfo?.taxId || '0105567012345'} | โทร: {companyInfo?.phone || '02-123-4567'}</div>
                <div>อีเมล: {companyInfo?.email || 'contact@pmt-buildflow.com'} | {companyInfo?.website || 'www.pmt-buildflow.com'}</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ใบเสนอราคา
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                QUOTATION / BOQ
              </div>
              <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                <strong>เลขที่:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{quotation.quotation_number}</span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#1e293b' }}>
                <strong>วันที่:</strong> {formatToDDMMYYYY(quotation.issue_date)}
              </div>
              {quotation.valid_until && (
                <div style={{ fontSize: '0.82rem', color: '#e11d48', fontWeight: 600 }}>
                  <strong>ยืนราคาถึง:</strong> {formatToDDMMYYYY(quotation.valid_until)}
                </div>
              )}
            </div>
          </div>

          {/* Customer & Project Meta Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.75rem', border: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>ลูกค้า (Customer Details):</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{quotation.customer_name || 'ลูกค้าทั่วไป'}</div>
              {quotation.customer_phone && <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>📞 {quotation.customer_phone}</div>} 
              {quotation.customer_address && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>📍 {quotation.customer_address}</div>} 
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.35rem' }}>ข้อมูลโครงการ (Project Details):</div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>{quotation.project_name || quotation.lead_job_type || 'งานบริการติดตั้ง/ปรับปรุง'}</div>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>ผู้เสนอราคา: {quotation.created_by || 'ฝ่ายขายและการตลาด'}</div>
            </div>
          </div>

          {/* Items Table */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center', width: '50px' }}>ลำดับ</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>รายละเอียดรายการ (Description)</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '80px' }}>จำนวน</th>
                  <th style={{ padding: '0.65rem 0.5rem', textAlign: 'center', width: '80px' }}>หน่วย</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '110px' }}>ราคา/หน่วย</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right', width: '120px' }}>จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      ไม่มีรายการสินค้า/บริการ
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>{item.service_name}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', color: '#64748b' }}>{item.unit_type || 'งาน'}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>{Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pricing & Terms Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '2rem', alignItems: 'flex-start' }}>
            
            {/* Left: Terms & Conditions */}
            <div style={{ background: '#f8fafc', padding: '1rem 1.2rem', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem', fontSize: '0.82rem' }}>
                ข้อกำหนดและเงื่อนไข (Terms & Conditions):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', lineHeight: '1.5' }}>
                {quotation.notes ? (
                  quotation.notes.split('\n').map((line: string, i: number) => (
                    <div key={i} style={{ display: 'flex', gap: '0.4rem' }}>
                      <span>•</span>
                      <span>{line.replace(/^•\s*/, '')}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div>• กำหนดยืนราคา 30 วัน นับจากวันที่ออกเอกสารใบเสนอราคา</div>
                    <div>• เงื่อนไขการชำระเงิน: งวดที่ 1 มัดจำ 30% วันทำสัญญา, งวดที่ 2 ระหว่างดำเนินการ 40%, งวดที่ 3 ส่งมอบงาน 30%</div>
                    <div>• รับประกันคุณภาพงานติดตั้งและบริการหลังการขาย 1 ปีเต็ม</div>
                  </>
                )}
              </div>
            </div>

            {/* Right: Calculations */}
            <div style={{ background: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '0.85rem 1.1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#475569' }}>
                <span>รวมเป็นเงิน (Subtotal):</span>
                <strong style={{ color: '#0f172a' }}>฿{Number(quotation.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', color: '#475569' }}>
                <span>ภาษีมูลค่าเพิ่ม 7% ({quotation.vat_type}):</span>
                <strong style={{ color: '#0f172a' }}>฿{Number(quotation.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem 0.85rem',
                background: '#0f172a',
                color: '#ffffff',
                borderRadius: '8px',
                marginTop: '0.5rem',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>จำนวนเงินรวมทั้งสิ้น:</span>
                <span style={{ fontWeight: 900, fontSize: '1.25rem', color: '#34d399' }}>
                  ฿{Number(quotation.grand_total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* SIGNATURES AREA */}
          <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            
            {isAlreadySigned ? (
              /* Already Signed Card */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'center' }}>
                <div>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: 800 }}>({quotation.created_by || 'ฝ่ายขายและการตลาด'})</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
                    ผู้เสนอราคา / Authorized Signature
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                    วันที่: {formatToDDMMYYYY(quotation.issue_date)}
                  </div>
                </div>

                <div>
                  <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                    {quotation.customer_signature ? (
                      <img src={quotation.customer_signature} alt="Customer Signature" style={{ maxHeight: '65px', maxWidth: '200px', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#10b981', fontWeight: 800 }}>✓ ลงนามทางออนไลน์</span>
                    )}
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.4rem', fontSize: '0.8rem', color: '#0f172a', fontWeight: 700 }}>
                    ({quotation.customer_signed_name || signerName || quotation.customer_name})
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '2px' }}>
                    ผู้อนุมัติสั่งจ้าง / Customer Acceptance (เซ็นต์เมื่อ {formatToDDMMYYYY(quotation.customer_signed_at || new Date().toISOString())})
                  </div>
                </div>
              </div>
            ) : (
              /* E-Signature Form for Customer */
              <form onSubmit={handleConfirmSignature} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.35rem' }}>
                    ✍️ ลงนามอนุมัติสั่งจ้างตามใบเสนอราคา (Customer Digital E-Signature)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                    กรุณาวาดลายเซ็นต์ด้วยนิ้วหรือเมาส์ และระบุชื่อผู้มีอำนาจลงนามเพื่อยืนยันการว่าจ้าง
                  </p>
                </div>

                {/* Signer Inputs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      ชื่อ-นามสกุล ผู้มีอำนาจลงนาม / ผู้ว่าจ้าง *
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={e => setSignerName(e.target.value)}
                      placeholder="เช่น คุณสมชาย เจริญสุข"
                      required
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      เบอร์โทรศัพท์ติดต่อ
                    </label>
                    <input
                      type="text"
                      value={signerPhone}
                      onChange={e => setSignerPhone(e.target.value)}
                      placeholder="08X-XXX-XXXX"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Signature Pad */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                      วาดลายเซ็นต์ลงในกรอบด้านล่างนี้ *
                    </label>
                    {hasSignature && (
                      <button
                        type="button"
                        onClick={clearCanvas}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        ✕ ล้างลายเซ็นต์
                      </button>
                    )}
                  </div>

                  <div style={{
                    border: hasSignature ? '2px solid #2563eb' : '2px dashed #94a3b8',
                    borderRadius: '10px',
                    background: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    touchAction: 'none'
                  }}>
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
                      style={{
                        width: '100%',
                        height: '160px',
                        display: 'block',
                        cursor: 'crosshair'
                      }}
                    />
                    {!hasSignature && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                        color: '#94a3b8',
                        fontSize: '0.85rem'
                      }}>
                        ✍️ เซ็นต์ชื่อด้วยนิ้วหรือเมาส์ที่นี่
                      </div>
                    )}
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1.25rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={e => setAgreed(e.target.checked)}
                    required
                    style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#2563eb' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
                    ข้าพเจ้าได้ตรวจสอบรายละเอียด รายการสินค้าและราคาตามใบเสนอราคาเลขที่ <strong>{quotation.quotation_number}</strong> ถูกต้องครบถ้วนแล้ว และยินยอมรับข้อกำหนดเงื่อนไขเพื่ออนุมัติสั่งจ้าง
                  </span>
                </label>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !hasSignature}
                  style={{
                    width: '100%',
                    padding: '0.85rem 1.5rem',
                    background: hasSignature && agreed ? 'linear-gradient(135deg, #10b981, #059669)' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    cursor: hasSignature && agreed && !isSubmitting ? 'pointer' : 'not-allowed',
                    boxShadow: hasSignature && agreed ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="spin-animation" /> กำลังบันทึกการลงนาม...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} /> ✍️ ยืนยันการลงนาม & อนุมัติสั่งจ้าง
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

        </div>

        {/* Footer Note */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          เอกสารอิเล็กทรอนิกส์นี้ออกโดยระบบบริหารจัดการโครงการ PMT Design & Renovation BuildFlow
        </div>

      </div>
    </div>
  );
};
