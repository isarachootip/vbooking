import { useState, useEffect } from 'react';
import { Users, Plus, CheckCircle2, RefreshCw } from 'lucide-react';
import type { User } from '../types';
import { formatToDDMMYYYY } from '../utils';

interface Lead {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  job_type: string;
  status: string;
  notes: string;
  created_at: string;
  updated_at: string;
  project_id: string | null;
}

interface LeadsPageProps {
  currentUser: User | null;
}

export const LeadsPage = ({ currentUser }: LeadsPageProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [jobType, setJobType] = useState('Quick Service');
  const [status, setStatus] = useState('New');
  const [notes, setNotes] = useState('');

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/leads');
      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Failed to fetch leads', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const leadData = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_address: customerAddress,
      job_type: jobType,
      status: status,
      notes: notes,
    };

    try {
      let response;
      if (editingLead) {
        response = await fetch(`/api/leads/${editingLead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });
      } else {
        response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData),
        });
      }

      if (response.ok) {
        setIsModalOpen(false);
        fetchLeads();
      } else {
        alert('Failed to save lead');
      }
    } catch (err) {
      console.error('Error saving lead', err);
    }
  };

  const handleConvert = async (leadId: string) => {
    if (!confirm('ยืนยันแปลงลูกค้ารายนี้เป็นโปรเจกต์ใหม่? ระบบจะสร้าง Tasks ให้อัตโนมัติตามประเภทงาน')) return;
    
    try {
      const response = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id }),
      });
      
      if (response.ok) {
        alert('แปลงเป็นโปรเจกต์สำเร็จ!');
        fetchLeads();
      } else {
        const data = await response.json();
        alert('เกิดข้อผิดพลาด: ' + data.error);
      }
    } catch (err) {
      console.error('Error converting lead', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const openModal = (lead: Lead | null = null) => {
    if (lead) {
      setEditingLead(lead);
      setCustomerName(lead.customer_name);
      setCustomerPhone(lead.customer_phone || '');
      setCustomerAddress(lead.customer_address || '');
      setJobType(lead.job_type);
      setStatus(lead.status);
      setNotes(lead.notes || '');
    } else {
      setEditingLead(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setJobType('Quick Service');
      setStatus('New');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Contacted': return 'bg-yellow-100 text-yellow-800';
      case 'Qualified': return 'bg-purple-100 text-purple-800';
      case 'Converted': return 'bg-green-100 text-green-800';
      case 'Lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            รายชื่อลูกค้ามุ่งหวัง (Leads)
          </h1>
          <p className="text-slate-500 mt-1">จัดการข้อมูลลูกค้าและแปลงเป็นโปรเจกต์</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          เพิ่มลูกค้าใหม่
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ลูกค้า</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ติดต่อ</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ประเภทงาน</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">วันที่สร้าง</th>
                <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    ยังไม่มีข้อมูลลูกค้า
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-slate-900">{lead.customer_name}</div>
                      <div className="text-sm text-slate-500 truncate max-w-[200px]">{lead.customer_address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {lead.customer_phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                        {lead.job_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatToDDMMYYYY(lead.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {lead.status !== 'Converted' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openModal(lead)}
                            className="text-blue-600 hover:text-blue-900 px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded"
                          >
                            แก้ไข
                          </button>
                          <button
                            onClick={() => handleConvert(lead.id)}
                            className="flex items-center gap-1 text-green-700 hover:text-green-900 px-2 py-1 bg-green-50 hover:bg-green-100 rounded"
                          >
                            <RefreshCw className="w-3 h-3" /> แปลงเป็นงาน
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-4 h-4" /> เป็นโปรเจกต์แล้ว
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editingLead ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์ติดต่อ</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">ที่อยู่/พิกัดหน้างาน</label>
                  <textarea
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">ประเภทงานที่สนใจ *</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="Quick Service">Quick Service (งานซ่อมด่วน)</option>
                    <option value="Installation">Installation (งานติดตั้ง)</option>
                    <option value="Renovation">Renovation (งานรีโนเวท)</option>
                    <option value="General">ทั่วไป</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">สถานะ</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    disabled={status === 'Converted'}
                  >
                    <option value="New">New (ใหม่)</option>
                    <option value="Contacted">Contacted (ติดต่อแล้ว)</option>
                    <option value="Qualified">Qualified (รอลงหน้างาน)</option>
                    <option value="Lost">Lost (ยกเลิก)</option>
                    {status === 'Converted' && <option value="Converted">Converted (เป็นโปรเจกต์แล้ว)</option>}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">บันทึกเพิ่มเติมจากเซลล์</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="เช่น ข้อมูลหน้างาน, จุดที่ลูกค้ากังวล"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
