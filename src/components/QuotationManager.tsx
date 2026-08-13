import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, Printer, Save, CheckCircle } from 'lucide-react';
import type { ServicePriceItem } from '../types';

export const QuotationManager = () => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [priceBook, setPriceBook] = useState<ServicePriceItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form States
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [vatType, setVatType] = useState('Exclude VAT'); // The user specifically chose this switch option
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  
  // Calculate Totals
  const subtotal = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
  let vatAmount = 0;
  let grandTotal = subtotal;
  
  if (vatType === 'Exclude VAT') {
    vatAmount = subtotal * 0.07;
    grandTotal = subtotal + vatAmount;
  } else if (vatType === 'Include VAT') {
    vatAmount = subtotal - (subtotal / 1.07);
  }

  useEffect(() => {
    fetchQuotations();
    fetchPriceBook();
  }, []);

  const fetchQuotations = async () => {
    try {
      const res = await fetch('/api/quotations');
      if (res.ok) {
        const data = await res.json();
        setQuotations(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPriceBook = async () => {
    try {
      const res = await fetch('/api/pricebook');
      if (res.ok) {
        const data = await res.json();
        setPriceBook(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = (pbItem: ServicePriceItem) => {
    setItems([...items, {
      price_book_id: pbItem.id,
      service_name: pbItem.service_name,
      quantity: 1,
      unit_type: pbItem.unit_type,
      unit_cost: pbItem.material_cost + pbItem.labor_cost,
      unit_price: pbItem.selling_price,
      total_price: pbItem.selling_price
    }]);
  };

  const handleUpdateQuantity = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].quantity = qty;
    newItems[index].total_price = newItems[index].unit_price * qty;
    setItems(newItems);
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          issue_date: issueDate,
          vat_type: vatType,
          items: items,
          notes: notes
        })
      });
      if (res.ok) {
        setIsModalOpen(false);
        setItems([]);
        fetchQuotations();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`สำเร็จ! สร้างโปรเจกต์ใหม่เรียบร้อยแล้ว รหัส: ${data.project_id}`);
        fetchQuotations();
      } else {
        alert('เกิดข้อผิดพลาดในการแปลงใบเสนอราคา');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>ระบบออกใบเสนอราคา</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>จัดการใบเสนอราคา ดึงรายการจาก Price Book และคำนวณภาษีอัตโนมัติ</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ background: 'var(--accent-primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={18} /> สร้างใบเสนอราคาใหม่
        </button>
      </div>

      {/* Quotation List Table */}
      <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '1rem', fontWeight: 600 }}>เลขที่บิล</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>วันที่ออก</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>ยอดรวมทั้งสิ้น (Grand Total)</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>รูปแบบภาษี</th>
              <th style={{ padding: '1rem', fontWeight: 600 }}>สถานะ</th>
              <th style={{ padding: '1rem', fontWeight: 600, textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {quotations.map(quo => (
              <tr key={quo.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{quo.quotation_number}</td>
                <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>{quo.issue_date}</td>
                <td style={{ padding: '1rem', color: '#10b981', fontWeight: 700 }}>฿{Number(quo.grand_total).toLocaleString()}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontSize: '0.8rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{quo.vat_type}</span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700 }}>
                    {quo.status}
                  </span>
                </td>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="พิมพ์เอกสาร"><Printer size={18} /></button>
                    {quo.status !== 'Converted' && (
                      <button 
                        onClick={() => handleConvert(quo.id)}
                        style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="อนุมัติและสร้างโปรเจกต์อัตโนมัติ"
                      >
                        <CheckCircle size={14} /> สร้างโปรเจกต์
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE QUOTATION MODAL */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '2rem' }}>
          <div className="glass-panel" style={{ width: '900px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={20} /> ร่างใบเสนอราคาใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>ปิด</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', flex: 1, overflow: 'hidden' }}>
              {/* Left Side: Quotation Builder */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', borderRight: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>วันที่ออกเอกสาร</label>
                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>รูปแบบภาษี (VAT Switcher)</label>
                    <select value={vatType} onChange={e => setVatType(e.target.value)} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}>
                      <option value="Exclude VAT">ราคาแยกภาษี (Exclude VAT + 7%)</option>
                      <option value="Include VAT">ราคารวมภาษีแล้ว (Include VAT)</option>
                      <option value="No VAT">ไม่คิดภาษี (No VAT)</option>
                    </select>
                  </div>
                </div>

                {/* Items Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left' }}>รายการสินค้า/บริการ</th>
                      <th style={{ padding: '0.5rem', textAlign: 'center', width: '100px' }}>จำนวน</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>ราคาต่อหน่วย</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มีรายการ กรุณาเลือกจาก Price Book ด้านขวา</td></tr>
                    ) : (
                      items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                          <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.service_name}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                            <input type="number" min="1" value={item.quantity} onChange={e => handleUpdateQuantity(idx, Number(e.target.value))} style={{ width: '60px', padding: '0.25rem', textAlign: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: 'var(--text-secondary)' }}>{Number(item.unit_price).toLocaleString()}</td>
                          <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(item.total_price).toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Totals Box */}
                <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>รวมเป็นเงิน (Subtotal):</span>
                    <span>฿{subtotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                    <span>฿{vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', width: '250px', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.2rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span>จำนวนเงินรวมทั้งสิ้น:</span>
                    <span style={{ color: '#10b981' }}>฿{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Right Side: Price Book Sidebar */}
              <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>ฐานข้อมูลราคา (Price Book)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {priceBook.map(pb => (
                    <div key={pb.id} style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{pb.service_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span>ราคาขาย: ฿{Number(pb.selling_price).toLocaleString()}</span>
                        <button onClick={() => handleAddItem(pb)} style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '4px', padding: '0.1rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem' }}>+ เพิ่ม</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: 'var(--bg-secondary)' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={items.length === 0} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', background: items.length > 0 ? '#10b981' : 'var(--bg-tertiary)', color: items.length > 0 ? 'white' : 'var(--text-muted)', border: 'none', cursor: items.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Save size={16} /> บันทึกใบเสนอราคา
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
