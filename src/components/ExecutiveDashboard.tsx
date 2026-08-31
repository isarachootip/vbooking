import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Target, Activity, Users, AlertTriangle, Clock, BarChart3 } from 'lucide-react';
import { PipelinePerformanceDashboard } from './PipelinePerformanceDashboard';

export const ExecutiveDashboard = ({ currentUser }: { currentUser: any }) => {
  const [activeTab, setActiveTab] = useState<'financial' | 'pipeline'>('pipeline');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(res => res.json())
      .then(resData => {
        setData(resData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (currentUser?.global_role !== 'admin' && currentUser?.global_role !== 'manager' && currentUser?.globalRole?.toLowerCase() !== 'admin' && currentUser?.globalRole?.toLowerCase() !== 'manager') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <AlertTriangle size={48} style={{ margin: '0 auto', marginBottom: '1rem', color: '#f59e0b' }} />
        <h2>Permission Denied</h2>
        <p>You do not have permission to view the Executive Dashboard.</p>
      </div>
    );
  }

  if (loading || !data) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Dashboard Data...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>Executive Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>ภาพรวมการเงิน การดำเนินงาน และประสิทธิภาพกระบวนการ 12 ขั้นตอน ประจำปี {data.financial.year}</p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-color)', gap: '0.25rem' }}>
          <button
            onClick={() => setActiveTab('pipeline')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: activeTab === 'pipeline' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'pipeline' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <Clock size={16} /> ⏱️ มอนิเตอร์เวลา 12 ขั้นตอน & SLA
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: activeTab === 'financial' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'financial' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={16} /> 📊 ภาพรวมการเงิน & ยอดขาย
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <PipelinePerformanceDashboard currentUser={currentUser} />
      ) : (
        <>
      {/* 1. Financial Overview Cards */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <DollarSign size={18} color="#10b981" /> Financial Overview (Yearly)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>ยอดขายรวม (Total Revenue)</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ฿{Number(data.financial.totalRevenue).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.5rem', fontWeight: 600 }}>จาก {data.financial.projectCount} โครงการ</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>เงินรอรับ/เสนอราคา (Pipeline)</div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            ฿{Number(data.financial.pipelineValue).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#3b82f6', marginTop: '0.5rem', fontWeight: 600 }}>อยู่ในขั้นตอนเสนอราคา</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* 2. Sales Performance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Target size={18} color="#8b5cf6" /> Sales Funnel & Conversion
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#8b5cf6' }}>{data.sales.conversionRate}%</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Lead Conversion Rate</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{data.sales.funnel.Total}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Leads</div>
            </div>
          </div>

          {/* Simple Funnel Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { label: 'ติดต่อแล้ว (Contacted)', val: data.sales.funnel.Contacted, color: '#3b82f6' },
              { label: 'รอสำรวจ (Qualified)', val: data.sales.funnel.Qualified, color: '#f59e0b' },
              { label: 'ปิดการขาย (Converted)', val: data.sales.funnel.Converted, color: '#10b981' },
              { label: 'ยกเลิก (Lost)', val: data.sales.funnel.Lost, color: '#ef4444' }
            ].map(stage => {
              const pct = data.sales.funnel.Total > 0 ? (stage.val / data.sales.funnel.Total) * 100 : 0;
              return (
                <div key={stage.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                    <span>{stage.label}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{stage.val}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: stage.color, borderRadius: '4px' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Operations Performance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#f59e0b" /> Operations & Project Health
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700 }}>กำลังดำเนินการ (Active)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{data.operations.projectHealth.Active}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>ส่งมอบแล้ว (Done)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{data.operations.projectHealth.Done}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              <Users size={16} /> ภาพรวมทีมช่าง (Team Capacity)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              พบว่ามีโครงการที่เสร็จสมบูรณ์แล้ว {data.operations.projectHealth.Done} โครงการ 
              และมีกำลังคนเพียงพอสำหรับรองรับโครงการใหม่ที่กำลังรอนุมัติใน Pipeline
            </p>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

