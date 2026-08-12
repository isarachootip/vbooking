import React, { useState } from 'react';
import type { ServicePriceItem } from '../types';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface PriceBookManagerProps {
  priceBook: ServicePriceItem[];
  setPriceBook: (pb: ServicePriceItem[]) => void;
}

export const PriceBookManager = ({ priceBook, setPriceBook }: PriceBookManagerProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServicePriceItem | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    service_name: '',
    unit_type: '',
    material_cost: 0,
    labor_cost: 0,
    selling_price: 0,
    is_active: true
  });

  const handleOpenModal = (item?: ServicePriceItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        category: item.category,
        service_name: item.service_name,
        unit_type: item.unit_type,
        material_cost: item.material_cost,
        labor_cost: item.labor_cost,
        selling_price: item.selling_price,
        is_active: item.is_active
      });
    } else {
      setEditingItem(null);
      setFormData({
        category: '',
        service_name: '',
        unit_type: 'ตร.ม.',
        material_cost: 0,
        labor_cost: 0,
        selling_price: 0,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      // Update
      const res = await fetch(`/api/pricebook/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setPriceBook(priceBook.map(pb => pb.id === editingItem.id ? { ...pb, id: pb.id } : pb));
        setIsModalOpen(false);
      }
    } else {
      // Create
      const newItem = { ...formData, id: `pb_${Date.now()}` };
      const res = await fetch('/api/pricebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });
      if (res.ok) {
        setPriceBook([...priceBook, newItem as ServicePriceItem]);
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
      const res = await fetch(`/api/pricebook/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPriceBook(priceBook.filter(pb => pb.id !== id));
      }
    }
  };

  const grouped = priceBook.reduce((acc, item) => {
    const cat = item.category || 'อื่นๆ';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, ServicePriceItem[]>);

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            ฐานข้อมูลราคา (Service Price Book)
          </h3>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            จัดการราคาต้นทุนและราคาขาย สำหรับใช้ในใบเสนอราคาและ BOQ
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}
        >
          <Plus size={16} /> เพิ่มรายการใหม่
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>หมวดหมู่งาน</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>รายการ</th>
              <th style={{ padding: '0.75rem', fontWeight: 600 }}>หน่วย</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>ต้นทุนรวม</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>ราคาขาย</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'right' }}>กำไรขั้นต้น</th>
              <th style={{ padding: '0.75rem', fontWeight: 600, textAlign: 'center' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).map(cat => (
              <React.Fragment key={cat}>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <td colSpan={7} style={{ padding: '0.5rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{cat}</td>
                </tr>
                {grouped[cat].map(item => {
                  const totalCost = Number(item.material_cost) + Number(item.labor_cost);
                  const margin = item.selling_price > 0 ? ((item.selling_price - totalCost) / item.selling_price) * 100 : 0;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem' }}></td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>{item.service_name}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{item.unit_type}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#ef4444' }}>{totalCost.toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{Number(item.selling_price).toLocaleString()}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '12px', background: margin >= 30 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: margin >= 30 ? '#10b981' : '#f59e0b', fontSize: '0.8rem', fontWeight: 700 }}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button onClick={() => handleOpenModal(item)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '0.25rem' }}><Edit size={16} /></button>
                        <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem' }}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            {priceBook.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>ไม่มีข้อมูลฐานราคา</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '500px', width: '100%' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>{editingItem ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}</h3>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>หมวดหมู่งาน</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="เช่น งานไฟฟ้า" required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>หน่วยนับ</label>
                  <input type="text" value={formData.unit_type} onChange={e => setFormData({...formData, unit_type: e.target.value})} placeholder="เช่น ตร.ม." required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ชื่อรายการ (Service Name)</label>
                <input type="text" value={formData.service_name} onChange={e => setFormData({...formData, service_name: e.target.value})} required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ต้นทุนวัสดุ</label>
                  <input type="number" min="0" value={formData.material_cost} onChange={e => setFormData({...formData, material_cost: Number(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ต้นทุนค่าแรง</label>
                  <input type="number" min="0" value={formData.labor_cost} onChange={e => setFormData({...formData, labor_cost: Number(e.target.value)})} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ราคาขายรวม (Selling Price)</label>
                <input type="number" min="0" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: Number(e.target.value)})} required style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>ยกเลิก</button>
                <button type="submit" style={{ background: 'var(--accent-primary)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
