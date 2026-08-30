import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileSpreadsheet, CheckSquare, Clock, Users, Settings as SettingsIcon, LogOut, Briefcase, BarChart3, Menu, X, CalendarRange, Bell, AlertTriangle, AlertCircle, CalendarClock, HelpCircle, MessageSquare, Kanban, CalendarDays, MapPin, Sun, Moon, UserCog, Database, Activity, Navigation, FileText, ClipboardList } from 'lucide-react';

import { PMTBrandLogo } from './components/PMTBrandLogo';
import { Dashboard } from './components/Dashboard';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { Projects } from './components/Projects';
import { Timesheet } from './components/Timesheet';
import { SiteCheckInOut } from './components/SiteCheckInOut';
import { QCDailyPlanComponent } from './components/QCDailyPlan';
import { Tasks } from './components/Tasks';
import { TeamApprovals } from './components/TeamApprovals';
import { UserManagement } from './components/UserManagement';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { MasterManagement } from './components/MasterManagement';
import { ProjectPlan } from './components/ProjectPlan';
import { ProjectChat } from './components/ProjectChat';
import KnowledgeBase from './components/KnowledgeBase';
import ChatWidget from './components/ChatWidget';
import { ProjectBoard } from './components/ProjectBoard';
import { ProjectTimeline } from './components/ProjectTimeline';
import { ProjectDetail } from './components/ProjectDetail';
import { LeadsPage } from './components/LeadsPage';
import { QuotationManager } from './components/QuotationManager';
import { DraftEstimationManager } from './components/DraftEstimationManager';
import { CustomerMasterManager } from './components/CustomerMasterManager';
import { MAContracts } from './components/MAContracts';
import { PublicQuotationSign } from './components/PublicQuotationSign';


import { mockUsers, mockProjects, mockTasks, mockTimesheets } from './data/mockData';
import type { User, Project, Task, TimesheetEntry, TaskTemplate, Sprint, Release, PermissionScheme, ProjectWorkflow, CostRate, MasterProjectType, SystemSettings, Branch, ServicePriceItem } from './types';
import { formatToDDMMYYYY } from './utils';
import { useLanguage } from './i18n/LanguageContext';
import './index.css';

// --- Helper to use LocalStorage with fallback ---
const getLocalStorage = <T,>(key: string, fallback: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
};

const SidebarItem = ({ icon: Icon, label, path, badgeCount }: { icon: any, label: string, path: string, badgeCount?: number }) => {
  const location = useLocation();
  const isActive = location.pathname === path;
  
  return (
    <Link 
      to={path} 
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1.5rem',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--bg-tertiary)' : 'transparent',
        borderRight: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
        transition: 'all var(--transition-fast)',
        fontWeight: isActive ? 500 : 400,
        position: 'relative'
      }}
      className="hover-lift"
    >
      <Icon size={20} color={isActive ? 'var(--accent-primary)' : 'currentColor'} />
      <span style={{ flex: 1 }}>{label}</span>
      {badgeCount && badgeCount > 0 ? (
        <span 
          style={{
            background: 'var(--accent-danger, #ef4444)',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.1rem 0.4rem',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center'
          }}
        >
          {badgeCount}
        </span>
      ) : null}
    </Link>
  );
};

// ─── Notification Bell Component ───
const NotificationBell = ({ tasks, currentUser }: { tasks: Task[], currentUser: User }) => {
  const [open, setOpen] = useState(false);
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const [qcPlanStops, setQcPlanStops] = useState<any[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const myTasks = tasks.filter(t => t.assigneeId === currentUser.id && t.status !== 'Done' && t.endDate);
  const overdue = myTasks.filter(t => new Date(t.endDate!) < today);
  const dueSoon = myTasks.filter(t => { const d = new Date(t.endDate!); return d >= today && d <= in3Days; });
  const dueThisWeek = myTasks.filter(t => { const d = new Date(t.endDate!); return d > in3Days && d <= in7Days; });

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}/chat-notifications`);
      if (res.ok) {
        const data = await res.json();
        setChatNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat notifications:', err);
    }
  };

  const fetchQCNotifications = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/qc-plans/daily?qcId=${currentUser.id}&date=${todayStr}`, {
        headers: { 'X-User-Id': currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const plan = data[0];
          const pending = (plan.items || []).filter((it: any) => it.status !== 'Completed' && it.status !== 'Skipped');
          setQcPlanStops(pending);
        } else {
          setQcPlanStops([]);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchQCNotifications();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchQCNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const unreadChatNotifs = chatNotifications.filter(n => !n.isRead);
  const total = overdue.length + dueSoon.length + dueThisWeek.length + unreadChatNotifs.length + qcPlanStops.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAsRead = async (notifId: string, projectId: string) => {
    try {
      await fetch(`/api/chat-notifications/${notifId}/read`, { method: 'POST' });
      fetchNotifications();
      setOpen(false);
      window.location.href = `/chat?projectId=${projectId}`;
    } catch (err) {
      console.error(err);
    }
  };

  const NotifRow = ({ icon, color, label, tasks }: { icon: React.ReactNode, color: string, label: string, tasks: Task[] }) => (
    tasks.length > 0 ? <>
      <div style={{ padding: '0.6rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color, background: `${color}15`, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {icon} {label} ({tasks.length})
      </div>
      {tasks.map(t => (
        <div key={t.id} className="notif-item">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>Due: {formatToDDMMYYYY(t.endDate)}</div>
          </div>
        </div>
      ))}
    </> : null
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="notif-bell-btn" onClick={() => setOpen(o => !o)} title="Notifications">
        <Bell size={20} />
        {total > 0 && <span className="notif-badge">{total > 9 ? '9+' : total}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>🔔 Notifications</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{total} items</span>
          </div>
          {total === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>✅ All caught up! No notifications.</div>
          ) : (
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {/* QC Daily Visits Notification */}
              {qcPlanStops.length > 0 && (
                <>
                  <div style={{ padding: '0.6rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Navigation size={12} /> แผนตรวจ QC วันนี้ ({qcPlanStops.length} จุดตรวจ)
                  </div>
                  {qcPlanStops.map(stop => (
                    <div
                      key={stop.id}
                      className="notif-item"
                      onClick={() => {
                        setOpen(false);
                        window.location.href = '/qc-daily-plan';
                      }}
                      style={{ cursor: 'pointer', transition: 'background 0.2s', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
                    >
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#0284c7', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, marginTop: '0.1rem', flexShrink: 0 }}>
                        {stop.sequenceOrder || '📍'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {stop.siteName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                          ⏰ {stop.timeSlot || 'ช่วงเวลานัดหมาย'} • {stop.siteAddress || 'ไม่มีที่อยู่'}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {/* Chat Mentions Row */}
              {unreadChatNotifs.length > 0 && (
                <>
                  <div style={{ padding: '0.6rem 1.25rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MessageSquare size={12} /> Chat Mentions ({unreadChatNotifs.length})
                  </div>
                  {unreadChatNotifs.map(n => (
                    <div 
                      key={n.id} 
                      className="notif-item" 
                      onClick={() => handleMarkAsRead(n.id, n.projectId)}
                      style={{ cursor: 'pointer', transition: 'background 0.2s', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
                    >
                      {n.senderAvatar ? (
                        <img src={n.senderAvatar} alt={n.senderName} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', marginTop: '0.1rem' }} />
                      ) : (
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                          {n.senderName.charAt(0)}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          <strong>{n.senderName}</strong> mentioned you in <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>#{n.projectName}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                          "{n.text}"
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              
              <NotifRow icon={<AlertTriangle size={12} />} color="#ef4444" label="Overdue Tasks" tasks={overdue} />
              <NotifRow icon={<AlertCircle size={12} />} color="#f59e0b" label="Due in 3 days" tasks={dueSoon} />
              <NotifRow icon={<CalendarClock size={12} />} color="#3b82f6" label="Due this week" tasks={dueThisWeek} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── QC Plan Quick Button & Notification Badge ───
const QCPlanQuickButton = ({ currentUser }: { currentUser: User }) => {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const location = useLocation();
  const isActive = location.pathname === '/qc-daily-plan';
  const todayStr = new Date().toISOString().split('T')[0];

  const fetchQCPlanSummary = async () => {
    try {
      const res = await fetch(`/api/qc-plans/daily?qcId=${currentUser.id}&date=${todayStr}`, {
        headers: { 'X-User-Id': currentUser.id }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const plan = data[0];
          const pending = (plan.items || []).filter((it: any) => it.status !== 'Completed' && it.status !== 'Skipped').length;
          setPendingCount(pending);
        } else {
          setPendingCount(0);
        }
      }
    } catch {
      // silent fallback
    }
  };

  useEffect(() => {
    fetchQCPlanSummary();
    const interval = setInterval(fetchQCPlanSummary, 15000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  return (
    <Link 
      to="/qc-daily-plan" 
      className="glass-panel hover-lift"
      title="แผนงานและเส้นทางตรวจ QC ประจำวัน (Daily QC Plan)"
      style={{ 
        padding: '0.45rem 0.85rem', 
        color: isActive ? '#ffffff' : '#0284c7',
        background: isActive ? 'linear-gradient(135deg, #0284c7, #2563eb)' : 'rgba(2, 132, 199, 0.09)',
        border: isActive ? '1px solid #0284c7' : '1px solid rgba(2, 132, 199, 0.35)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.45rem', 
        textDecoration: 'none',
        fontSize: '0.85rem',
        fontWeight: 700,
        position: 'relative'
      }}
    >
      <Navigation size={17} color={isActive ? '#ffffff' : '#0284c7'} />
      <span className="hide-mobile">
        แผนตรวจ QC
      </span>
      {pendingCount > 0 && (
        <span 
          style={{
            background: '#ef4444',
            color: 'white',
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '0.1rem 0.4rem',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center',
            lineHeight: '1.2',
            boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
          }}
        >
          {pendingCount}
        </span>
      )}
    </Link>
  );
};

// ─── Mobile Bottom Nav ───
const MobileBottomNav = () => {
  const location = useLocation();
  const links = [
    { path: '/', icon: LayoutDashboard, label: 'แดชบอร์ด' },
    { path: '/qc-daily-plan', icon: Navigation, label: 'แผนตรวจ QC' },
    { path: '/leads', icon: Users, label: 'ลูกค้า Leads' },
    { path: '/timesheet', icon: Clock, label: 'บันทึกงาน' },
    { path: '/tasks', icon: CheckSquare, label: 'ขั้นตอนงาน' },
  ];
  return (
    <nav className="mobile-bottom-nav">
      {links.map(({ path, icon: Icon, label }) => (
        <Link key={path} to={path} className={location.pathname === path ? 'active' : ''}>
          <Icon size={20} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
};

const AppLayout = ({ children, currentUser, tasks, onLogout }: { children: React.ReactNode, currentUser: User, tasks: Task[], onLogout: () => void }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const { lang, toggleLang, t } = useLanguage();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('app_theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    document.body.className = `${theme}-theme`;
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}/chat-notifications`);
      if (res.ok) {
        const data = await res.json();
        setChatNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch chat notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [currentUser.id]);

  const unreadChatCount = chatNotifications.filter(n => !n.isRead).length;

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ padding: 0, borderBottom: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', background: '#ece9e9' }}>
          <PMTBrandLogo variant="sidebar" />
          <button 
            className="mobile-close-btn"
            onClick={() => setIsSidebarOpen(false)}
            style={{ position: 'absolute', right: '10px', top: '10px', background: 'rgba(0,0,0,0.2)', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '4px', zIndex: 10 }}
          >
            <X size={20} />
          </button>
        </div>
        
        <nav style={{ padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }} onClick={() => setIsSidebarOpen(false)}>
          <SidebarItem icon={Activity} label="Executive Dashboard" path="/exec-dashboard" />
          <SidebarItem icon={LayoutDashboard} label={t.dashboard} path="/" />
          <SidebarItem icon={Users} label={t.leads} path="/leads" />
          <SidebarItem icon={FileSpreadsheet} label={lang === 'th' ? 'Draft & เทียบราคาช่าง' : 'Cost Estimation & Bids'} path="/estimations" />
          <SidebarItem icon={FileText} label={t.quotations} path="/quotations" />
          <SidebarItem icon={Briefcase} label={t.projects} path="/projects" />
          <SidebarItem icon={Kanban} label={t.projectBoard} path="/project-board" />
          <SidebarItem icon={CalendarDays} label={t.projectTimeline} path="/project-timeline" />
          <SidebarItem icon={CalendarRange} label={t.projectPlan} path="/project-plan" />
          <SidebarItem icon={CheckSquare} label={t.tasks} path="/tasks" />
          <SidebarItem icon={Clock} label={t.timesheet} path="/timesheet" />
          <SidebarItem icon={MapPin} label={t.siteCheckInOut} path="/checkin-checkout" />
          <SidebarItem icon={Navigation} label={lang === 'th' ? 'แผนงาน QC (Daily Plan)' : 'QC Daily Plan'} path="/qc-daily-plan" />
          <SidebarItem icon={MessageSquare} label={t.chat} path="/chat" badgeCount={unreadChatCount} />
          <SidebarItem icon={Users} label={t.team} path="/team" />
          <SidebarItem icon={UserCog} label={t.userManagement} path="/users" />
          <SidebarItem icon={Users} label={lang === 'th' ? 'ข้อมูลลูกค้า & ไซต์งาน' : 'Customers & Sites'} path="/customers" />
          <SidebarItem icon={ClipboardList} label={lang === 'th' ? 'สัญญา MA 🔧' : 'MA Contracts'} path="/ma-contracts" />

          <SidebarItem icon={Database} label={lang === 'th' ? 'จัดการ Master Data' : 'Maintain Master'} path="/master-management" />
          <SidebarItem icon={BarChart3} label={t.reports} path="/reports" />
          <SidebarItem icon={SettingsIcon} label={t.settings} path="/settings" />
          <SidebarItem icon={HelpCircle} label={t.help} path="/help" />
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div onClick={() => { onLogout(); setIsSidebarOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }} className="hover-lift" title="Log out">
            <img src={currentUser.avatar} alt="User Profile" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.75rem' }}>{currentUser.globalRole}</div>
            </div>
            <LogOut size={18} color="var(--accent-danger)" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setIsSidebarOpen(true)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center', padding: '0.25rem' }}
            >
              <Menu size={24} />
            </button>
            <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 500 }}>System Overview</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={toggleLang}
              className="glass-panel hover-lift"
              title="Switch Language (TH / EN)"
              style={{ padding: '0.5rem 0.85rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <span>{lang === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}</span>
            </button>
            <button 
              onClick={toggleTheme} 
              className="glass-panel hover-lift" 
              title={theme === 'light' ? 'สลับเป็น Theme มืด (Dark Mode)' : 'สลับเป็น Theme สว่าง (Light Mode)'}
              style={{ padding: '0.5rem 0.85rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', outline: 'none', fontSize: '0.85rem', fontWeight: 500 }}
            >
              {theme === 'light' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#00F5FF" />}
              <span className="hide-mobile" style={{ fontSize: '0.875rem' }}>{theme === 'light' ? t.themeLight : t.themeDark}</span>
            </button>
            <QCPlanQuickButton currentUser={currentUser} />
            <NotificationBell tasks={tasks} currentUser={currentUser} />
            <Link to="/settings" className="glass-panel hover-lift" style={{ padding: '0.5rem 1rem', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', outline: 'none', textDecoration: 'none' }}>
              <SettingsIcon size={18} />
              <span className="hide-mobile" style={{ fontSize: '0.875rem' }}>{t.settings}</span>
            </Link>
          </div>
        </header>
        
        <div className="content-area">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

// ─── Actual Hours Modal ───
interface ActualHoursModalProps {
  task: Task;
  onConfirm: (actualHours: number, startTime?: string, endTime?: string) => void;
  onCancel: () => void;
}
const ActualHoursModal = ({ task, onConfirm, onCancel }: ActualHoursModalProps) => {
  const planned = task.estimatedHours && task.estimatedHours > 0 ? task.estimatedHours : 8;
  const defaultHours = planned > 8 ? 8 : planned;

  const [hours, setHours] = useState(String(defaultHours));
  
  // Pre-fill start and end times for common default hours to show active selection
  const [startTime, setStartTime] = useState(defaultHours === 8 ? '09:00' : defaultHours === 4 ? '09:00' : '');
  const [endTime, setEndTime] = useState(defaultHours === 8 ? '17:00' : defaultHours === 4 ? '13:00' : '');

  const BAR_START = 6, BAR_END = 22, SLOTS = (BAR_END - BAR_START) * 2;
  const slotToTime = (slot: number) => `${String(BAR_START + Math.floor(slot / 2)).padStart(2, '0')}:${String((slot % 2) * 30).padStart(2, '0')}`;
  const timeToSlot = (t: string) => { if (!t) return -1; const [h, m] = t.split(':').map(Number); return (h - BAR_START) * 2 + Math.round(m / 30); };
  const startSlot = timeToSlot(startTime), endSlot = timeToSlot(endTime);
  const calcDiff = (s: string, e: string) => { const [sh, sm] = s.split(':').map(Number); const [eh, em] = e.split(':').map(Number); return (eh * 60 + em - sh * 60 - sm) / 60; };
  const handleStartChange = (val: string) => { setStartTime(val); if (val && endTime) { const d = calcDiff(val, endTime); if (d > 0) setHours(String(d)); } };
  const handleEndChange = (val: string) => { setEndTime(val); if (startTime && val) { const d = calcDiff(startTime, val); if (d > 0) setHours(String(d)); } };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const val = parseFloat(hours); if (!val || val <= 0) return; onConfirm(val, startTime || undefined, endTime || undefined); };
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-panel" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '2rem', maxWidth: '520px', width: '100%', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Clock size={18} color="var(--accent-primary)" /></div>
          <div><div style={{ fontWeight: 700, fontSize: '1rem' }}>Log Actual Hours</div><div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Task moved to In Progress</div></div>
        </div>
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '0.875rem' }}>{task.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Planned:</span>
            <strong style={{ color: 'var(--accent-warning)' }}>{planned}h</strong>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Work Period — Drag to select time range</label>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {startTime && endTime ? (<><span style={{ background: 'rgba(0,206,209,0.15)', border: '1px solid rgba(0,206,209,0.3)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--accent-primary)' }}>{startTime}</span><span style={{ color: 'var(--text-muted)' }}>→</span><span style={{ background: 'rgba(0,206,209,0.15)', border: '1px solid rgba(0,206,209,0.3)', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 600, color: 'var(--accent-primary)' }}>{endTime}</span></>) : (<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click and drag on the bar below</span>)}
              </div>
              {hours && <span style={{ background: 'linear-gradient(135deg,rgba(0,206,209,0.2),rgba(124,58,237,0.2))', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{hours}h</span>}
            </div>
            <div style={{ position: 'relative', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', overflow: 'hidden', userSelect: 'none', cursor: 'crosshair' }}
              onMouseDown={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const slot = Math.max(0, Math.min(SLOTS, Math.round(((e.clientX - rect.left) / rect.width) * SLOTS)));
                setStartTime(slotToTime(slot)); setEndTime(''); setHours('');
                const mv = (ev: MouseEvent) => { const ms = Math.max(0, Math.min(SLOTS, Math.round(((ev.clientX - rect.left) / rect.width) * SLOTS))); if (ms !== slot) { const s = Math.min(slot,ms), en = Math.max(slot,ms); setStartTime(slotToTime(s)); setEndTime(slotToTime(en)); const d=(en-s)*0.5; if(d>0) setHours(String(d)); } };
                const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
                document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
              }}>
              <div style={{ display: 'flex', height: 20 }}>{Array.from({ length: BAR_END - BAR_START }, (_, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.55rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: 3 }}>{String(BAR_START + i).padStart(2, '0')}</div>)}</div>
              <div style={{ display: 'flex', height: 32 }}>{Array.from({ length: SLOTS }, (_, i) => { const sel = startSlot >= 0 && endSlot > startSlot && i >= startSlot && i < endSlot; return (<div key={i} style={{ flex: 1, background: sel ? 'linear-gradient(180deg,rgba(0,206,209,0.4),rgba(0,206,209,0.2))' : 'transparent', borderLeft: i%2===0 ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.02)', position: 'relative' }}>{sel && i===startSlot && <div style={{ position:'absolute',left:0,top:0,bottom:0,width:2,background:'var(--accent-primary)',borderRadius:1 }} />}{sel && i===endSlot-1 && <div style={{ position:'absolute',right:0,top:0,bottom:0,width:2,background:'var(--accent-primary)',borderRadius:1 }} />}</div>); })}</div>
              <div style={{ display: 'flex', height: 6 }}>{Array.from({ length: BAR_END - BAR_START }, (_, i) => <div key={i} style={{ flex: 1, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }} />)}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Start</span><input type="time" value={startTime} onChange={e => handleStartChange(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.4rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.75rem', flex: 1 }} /></div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>End</span><input type="time" value={endTime} onChange={e => handleEndChange(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.4rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.75rem', flex: 1 }} /></div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Hours</span><input type="number" step="0.5" min="0.5" max="24" value={hours} onChange={e => setHours(e.target.value)} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.4rem', color: 'var(--text-primary)', outline: 'none', fontSize: '0.75rem', flex: 1 }} /></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
            <button type="submit" style={{ flex: 2, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent-primary)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>✓ Submit Timesheet</button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [masterProjectTypes, setMasterProjectTypes] = useState<MasterProjectType[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [permissionSchemes, setPermissionSchemes] = useState<PermissionScheme[]>([]);
  const [projectWorkflows, setProjectWorkflows] = useState<ProjectWorkflow[]>([]);
  const [costRates, setCostRates] = useState<CostRate[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({});
  const [branches, setBranches] = useState<any[]>([]);
  const [masterBranches, setMasterBranches] = useState<any[]>([]);
  const [masterZones, setMasterZones] = useState<any[]>([]);
  const [priceBook, setPriceBook] = useState<ServicePriceItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => getLocalStorage<User | null>('nt_current_user', null));
  const [loading, setLoading] = useState(true);
  // Actual-hours modal state
  const [pendingTsTask, setPendingTsTask] = useState<Task | null>(null);

  // Check if we just redirected from successful LINE login
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('user');
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('auth_token', tokenParam);
    }
    if (userParam) {
      try {
        const userObj = JSON.parse(decodeURIComponent(userParam));
        setCurrentUser(userObj);
        if (window.location.pathname === '/login-success') {
          window.location.href = '/';
        } else {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err) {
        console.error('Error parsing login user:', err);
      }
    }
  }, []);

  // Unified Auth Headers Helper (handles JWT token and multi-storage fallback)
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    let userId = currentUser?.id;
    if (!userId && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('nt_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id) userId = parsed.id;
        }
      } catch {}
    }
    if (userId) {
      headers['X-User-Id'] = userId;
    }
    return headers;
  };

  // Fetch initial data from PostgreSQL
  const fetchInitialData = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    const storedUserStr = localStorage.getItem('nt_current_user');
    if (storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        if (storedUser && storedUser.id) {
          headers['x-user-id'] = storedUser.id;
        }
      } catch (e) {}
    }

    fetch(`/api/initial-data?t=${Date.now()}`, { headers })
      .then(res => {
        if (!res.ok) throw new Error('API returned status ' + res.status);
        return res.json();
      })
      .then(data => {
        setUsers(data.users || []);
        setProjects(data.projects || []);
        setTasks(data.tasks || []);
        setTimesheets(data.timesheets || []);
        setTaskTemplates(data.taskTemplates || []);
        setSprints(data.sprints || []);
        setReleases(data.releases || []);
        setPermissionSchemes(data.permissionSchemes || []);
        setProjectWorkflows(data.projectWorkflows || []);
        setCostRates(data.costRates || []);
        setSystemSettings(data.systemSettings || {});
        setBranches(data.branches || []);
        setMasterBranches(data.masterBranches || []);
        setMasterZones(data.masterZones || []);
        setPriceBook(data.priceBook || []);
        const settings = data.systemSettings || {};
        setSystemSettings(settings);
        
        if (settings.master_project_types) {
          try {
            const parsedTypes = JSON.parse(settings.master_project_types);
            setMasterProjectTypes(parsedTypes);
          } catch(e) {
            console.error('Failed to parse master_project_types', e);
          }
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching backend data, falling back to mocks:', err);
        setUsers(mockUsers);
        setProjects(mockProjects);
        setTasks(mockTasks);
        setTimesheets(mockTimesheets);
        setTaskTemplates([]);
        setMasterProjectTypes([]);
        setCostRates([]);
        setBranches([
          { id: 'br-st-60016', code: 'B16', name: 'สาขาภูเก็ต เฟสติวัล', province: 'ภูเก็ต', status: 'Active' },
          { id: 'br-st-60020', code: 'B20', name: 'สาขาศรีสมาน', province: 'นนทบุรี', status: 'Active' },
          { id: 'br-st-60022', code: 'B22', name: 'สาขาบางแสน', province: 'ชลบุรี', status: 'Active' }
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Sync current logged-in user in localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nt_current_user', JSON.stringify(currentUser));
      // Auto-add current user if not in database
      if (users.length > 0 && !users.some(u => u.id === currentUser.id)) {
        handleSetUsers(prev => [...prev, currentUser]);
      }
    } else {
      localStorage.removeItem('nt_current_user');
    }
  }, [currentUser, users]);

  // REST synchronizing hooks
  const handleSetUsers: React.Dispatch<React.SetStateAction<User[]>> = (value) => {
    setUsers(prev => {
      const nextUsers = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextUsers.length < prev.length) {
        const deletedUser = prev.find(pUser => !nextUsers.some(nUser => nUser.id === pUser.id));
        if (deletedUser) {
          fetch(`/api/users/${deletedUser.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete user');
                fetchInitialData();
              }
            });
        }
      } else {
        nextUsers.forEach(nUser => {
          const prevUser = prev.find(pUser => pUser.id === nUser.id);
          if (JSON.stringify(prevUser) !== JSON.stringify(nUser)) {
            fetch('/api/users', {
              method: 'POST',
              headers,
              body: JSON.stringify(nUser)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save user');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextUsers;
    });
  };

  const handleSetProjects: React.Dispatch<React.SetStateAction<Project[]>> = (value) => {
    setProjects(prev => {
      const nextProjects = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();

      // Detect deleted projects
      if (nextProjects.length < prev.length) {
        const deletedProject = prev.find(pProj => !nextProjects.some(nProj => nProj.id === pProj.id));
        if (deletedProject) {
          fetch(`/api/projects/${deletedProject.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete project');
                fetchInitialData();
              }
            });
        }
      }

      // Detect changed/new projects
      nextProjects.forEach(nProj => {
        const prevProj = prev.find(pProj => pProj.id === nProj.id);
        if (JSON.stringify(prevProj) !== JSON.stringify(nProj)) {
          fetch('/api/projects', {
            method: 'POST',
            headers,
            body: JSON.stringify(nProj)
          }).then(async res => {
            if (!res.ok) {
              const err = await res.json();
              alert(err.error || 'Failed to save project');
              fetchInitialData();
            }
          });
        }
      });
      return nextProjects;
    });
  };

  const handleSetTasks: React.Dispatch<React.SetStateAction<Task[]>> = (value) => {
    setTasks(prev => {
      const nextTasks = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextTasks.length < prev.length) {
        const deletedTask = prev.find(pTask => !nextTasks.some(nTask => nTask.id === pTask.id));
        if (deletedTask) {
          fetch(`/api/tasks/${deletedTask.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete task');
                fetchInitialData();
              }
            });
        }
      } else {
        nextTasks.forEach(nTask => {
          const prevTask = prev.find(pTask => pTask.id === nTask.id);
          if (JSON.stringify(prevTask) !== JSON.stringify(nTask)) {
            nTask.updatedAt = new Date().toISOString();
            fetch('/api/tasks', {
              method: 'POST',
              headers,
              body: JSON.stringify(nTask)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save task');
                fetchInitialData();
              } else {
                // If status transitioned to 'In Progress'
                const prevStatus = prevTask?.status?.toLowerCase() || '';
                const newStatus = nTask.status?.toLowerCase() || '';
                if (newStatus === 'in progress' && prevStatus !== 'in progress') {
                  // Show modal to let user enter actual hours instead of auto-using estimated hours
                  setPendingTsTask(nTask);
                }
              }
            });
          }
        });
      }
      return nextTasks;
    });
  };

  const handleSetTimesheets: React.Dispatch<React.SetStateAction<TimesheetEntry[]>> = (value) => {
    setTimesheets(prev => {
      const nextTimesheets = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextTimesheets.length < prev.length) {
        const deletedTs = prev.find(pTs => !nextTimesheets.some(nTs => nTs.id === pTs.id));
        if (deletedTs) {
          fetch(`/api/timesheets/${deletedTs.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete timesheet');
                fetchInitialData();
              }
            });
        }
      } else {
        nextTimesheets.forEach(nTs => {
          const prevTs = prev.find(pTs => pTs.id === nTs.id);
          if (JSON.stringify(prevTs) !== JSON.stringify(nTs)) {
            fetch('/api/timesheets', {
              method: 'POST',
              headers,
              body: JSON.stringify(nTs)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save timesheet');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextTimesheets;
    });
  };

  const handleSetTaskTemplates: React.Dispatch<React.SetStateAction<TaskTemplate[]>> = (value) => {
    setTaskTemplates(prev => {
      const nextTpl = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextTpl.length < prev.length) {
        const deletedTpl = prev.find(p => !nextTpl.some(n => n.id === p.id));
        if (deletedTpl) {
          fetch(`/api/task-templates/${deletedTpl.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete task template');
                fetchInitialData();
              }
            });
        }
      } else {
        nextTpl.forEach(nTpl => {
          const prevTpl = prev.find(p => p.id === nTpl.id);
          if (JSON.stringify(prevTpl) !== JSON.stringify(nTpl)) {
            fetch('/api/task-templates', {
              method: 'POST',
              headers,
              body: JSON.stringify(nTpl)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save task template');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextTpl;
    });
  };

  const handleSetMasterProjectTypes: React.Dispatch<React.SetStateAction<MasterProjectType[]>> = (value) => {
    setMasterProjectTypes(prev => {
      const nextTypes = typeof value === 'function' ? value(prev) : value;
      fetch('/api/system-settings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ master_project_types: JSON.stringify(nextTypes) })
      }).catch(err => {
        console.error('Failed to save master project types to system settings', err);
      });
      return nextTypes;
    });
  };

  const handleSetSprints: React.Dispatch<React.SetStateAction<Sprint[]>> = (value) => {
    setSprints(prev => {
      const nextSprints = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextSprints.length < prev.length) {
        const deletedSprint = prev.find(p => !nextSprints.some(n => n.id === p.id));
        if (deletedSprint) {
          fetch(`/api/sprints/${deletedSprint.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete sprint');
                fetchInitialData();
              }
            });
        }
      } else {
        nextSprints.forEach(n => {
          const prevSprint = prev.find(p => p.id === n.id);
          if (JSON.stringify(prevSprint) !== JSON.stringify(n)) {
            fetch('/api/sprints', {
              method: 'POST',
              headers,
              body: JSON.stringify(n)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save sprint');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextSprints;
    });
  };

  const handleSetReleases: React.Dispatch<React.SetStateAction<Release[]>> = (value) => {
    setReleases(prev => {
      const nextReleases = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextReleases.length < prev.length) {
        const deletedRelease = prev.find(p => !nextReleases.some(n => n.id === p.id));
        if (deletedRelease) {
          fetch(`/api/releases/${deletedRelease.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete release');
                fetchInitialData();
              }
            });
        }
      } else {
        nextReleases.forEach(n => {
          const prevRelease = prev.find(p => p.id === n.id);
          if (JSON.stringify(prevRelease) !== JSON.stringify(n)) {
            fetch('/api/releases', {
              method: 'POST',
              headers,
              body: JSON.stringify(n)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save release');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextReleases;
    });
  };

  const handleSetPermissionSchemes: React.Dispatch<React.SetStateAction<PermissionScheme[]>> = (value) => {
    setPermissionSchemes(prev => {
      const nextSchemes = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextSchemes.length < prev.length) {
        const deletedScheme = prev.find(p => !nextSchemes.some(n => n.id === p.id));
        if (deletedScheme) {
          fetch(`/api/permission-schemes/${deletedScheme.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete permission scheme');
                fetchInitialData();
              }
            });
        }
      } else {
        nextSchemes.forEach(n => {
          const prevScheme = prev.find(p => p.id === n.id);
          if (JSON.stringify(prevScheme) !== JSON.stringify(n)) {
            fetch('/api/permission-schemes', {
              method: 'POST',
              headers,
              body: JSON.stringify(n)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save permission scheme');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextSchemes;
    });
  };

  const handleSetProjectWorkflows: React.Dispatch<React.SetStateAction<ProjectWorkflow[]>> = (value) => {
    setProjectWorkflows(prev => {
      const nextWorkflows = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      nextWorkflows.forEach(n => {
        const prevWf = prev.find(p => p.projectId === n.projectId);
        if (JSON.stringify(prevWf) !== JSON.stringify(n)) {
          fetch(`/api/projects/${n.projectId}/workflow`, {
            method: 'POST',
            headers,
            body: JSON.stringify(n)
          }).then(async res => {
            if (!res.ok) {
              const err = await res.json();
              alert(err.error || 'Failed to save project workflow');
              fetchInitialData();
            }
          });
        }
      });
      return nextWorkflows;
    });
  };

  const handleSetCostRates: React.Dispatch<React.SetStateAction<CostRate[]>> = (value) => {
    setCostRates(prev => {
      const nextRates = typeof value === 'function' ? value(prev) : value;
      const headers = getAuthHeaders();
      if (nextRates.length < prev.length) {
        const deletedRate = prev.find(p => !nextRates.some(n => n.id === p.id));
        if (deletedRate) {
          fetch(`/api/cost-rates/${deletedRate.id}`, { method: 'DELETE', headers })
            .then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to delete cost rate');
                fetchInitialData();
              }
            });
        }
      } else {
        nextRates.forEach(n => {
          const prevRate = prev.find(p => p.id === n.id);
          if (JSON.stringify(prevRate) !== JSON.stringify(n)) {
            fetch('/api/cost-rates', {
              method: 'POST',
              headers,
              body: JSON.stringify(n)
            }).then(async res => {
              if (!res.ok) {
                const err = await res.json();
                alert(err.error || 'Failed to save cost rate');
                fetchInitialData();
              }
            });
          }
        });
      }
      return nextRates;
    });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('nt_current_user');
    setCurrentUser(null);
  };

  const isWidgetRoute = window.location.pathname === '/widget-iframe';
  const isPublicQuotationRoute = window.location.pathname.startsWith('/q/') || window.location.pathname.startsWith('/quotation-sign/');

  if (isWidgetRoute) {
    return (
      <Router>
        <Routes>
          <Route path="/widget-iframe" element={<ChatWidget />} />
        </Routes>
      </Router>
    );
  }

  if (isPublicQuotationRoute) {
    return (
      <Router>
        <Routes>
          <Route path="/q/:id" element={<PublicQuotationSign />} />
          <Route path="/quotation-sign/:id" element={<PublicQuotationSign />} />
        </Routes>
      </Router>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} availableUsers={users.length > 0 ? users : mockUsers} />;
  }

  if (loading) {
    return (
      <div className="flex-center" style={{ height: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <div className="text-gradient" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Loading system...</div>
        <p style={{ color: 'var(--text-secondary)' }}>Connecting to database...</p>
      </div>
    );
  }

  const handleActualHoursConfirm = (actualHours: number, startTime?: string, endTime?: string) => {
    if (!pendingTsTask) return;
    const nTask = pendingTsTask;
    const tsDate = nTask.startDate || new Date().toISOString().split('T')[0];
    const plannedHours = nTask.estimatedHours && nTask.estimatedHours > 0 ? nTask.estimatedHours : 8;
    const newTs: TimesheetEntry = {
      id: 'ts_' + Date.now(),
      userId: nTask.assigneeId || currentUser?.id || '',
      projectId: nTask.projectId,
      taskId: nTask.id,
      date: tsDate,
      hours: actualHours,
      plannedHours: plannedHours,
      startTime: startTime,
      endTime: endTime,
      description: `Started work on: ${nTask.title}`,
      status: 'Pending'
    };
    handleSetTimesheets(prevTs => {
      const isDuplicate = prevTs.some(t => t.taskId === newTs.taskId && t.date === newTs.date);
      if (isDuplicate) return prevTs;
      return [...prevTs, newTs];
    });
    setPendingTsTask(null);
  };

  return (
    <Router>
      {pendingTsTask && (
        <ActualHoursModal
          task={pendingTsTask}
          onConfirm={handleActualHoursConfirm}
          onCancel={() => setPendingTsTask(null)}
        />
      )}
      <AppLayout currentUser={currentUser} tasks={tasks} onLogout={handleLogout}>
        <Routes>
          <Route path="/exec-dashboard" element={<ExecutiveDashboard currentUser={currentUser} />} />
          <Route path="/" element={<Dashboard projects={projects} tasks={tasks} timesheets={timesheets} currentUser={currentUser} />} />
          <Route path="/leads" element={<LeadsPage currentUser={currentUser} branches={branches} users={users} />} />
          <Route path="/estimations" element={<DraftEstimationManager currentUser={currentUser} />} />
          <Route path="/quotations" element={<QuotationManager currentUser={currentUser} />} />
          <Route path="/projects" element={<Projects projects={projects} setProjects={handleSetProjects} users={users} tasks={tasks} permissionSchemes={permissionSchemes} currentUser={currentUser} projectWorkflows={projectWorkflows} setProjectWorkflows={handleSetProjectWorkflows} taskTemplates={taskTemplates} masterProjectTypes={masterProjectTypes} branches={branches} />} />
          <Route path="/projects/:id" element={<ProjectDetail projects={projects} setProjects={handleSetProjects} users={users} currentUser={currentUser} tasks={tasks} setTasks={handleSetTasks} projectWorkflows={projectWorkflows} timesheets={timesheets} setTimesheets={handleSetTimesheets} systemSettings={systemSettings} />} />

          <Route path="/project-board" element={<ProjectBoard projects={projects} setProjects={handleSetProjects} tasks={tasks} users={users} currentUser={currentUser} masterProjectTypes={masterProjectTypes} />} />
          <Route path="/project-timeline" element={<ProjectTimeline projects={projects} currentUser={currentUser} masterProjectTypes={masterProjectTypes} />} />
          <Route path="/project-plan" element={<ProjectPlan projects={projects} tasks={tasks} setTasks={handleSetTasks} users={users} taskTemplates={taskTemplates} permissionSchemes={permissionSchemes} currentUser={currentUser} fetchInitialData={fetchInitialData} />} />
          <Route path="/tasks" element={<Tasks tasks={tasks} setTasks={handleSetTasks} projects={projects} users={users} sprints={sprints} setSprints={handleSetSprints} releases={releases} setReleases={handleSetReleases} projectWorkflows={projectWorkflows} setProjectWorkflows={handleSetProjectWorkflows} permissionSchemes={permissionSchemes} currentUser={currentUser} taskTemplates={taskTemplates} />} />
          <Route path="/timesheet" element={<Timesheet timesheets={timesheets} setTimesheets={handleSetTimesheets} projects={projects} tasks={tasks} currentUser={currentUser} users={users} />} />
          <Route path="/checkin-checkout" element={<SiteCheckInOut timesheets={timesheets} setTimesheets={handleSetTimesheets} projects={projects} tasks={tasks} currentUser={currentUser} users={users} />} />
          <Route path="/qc-daily-plan" element={<QCDailyPlanComponent currentUser={currentUser} users={users} projects={projects} branches={branches} />} />
          <Route path="/chat" element={<ProjectChat projects={projects} users={users} currentUser={currentUser} systemSettings={systemSettings} />} />
          <Route path="/team" element={<TeamApprovals users={users} setUsers={handleSetUsers} timesheets={timesheets} setTimesheets={handleSetTimesheets} projects={projects} setProjects={handleSetProjects} tasks={tasks} currentUser={currentUser} branches={branches} />} />
          <Route path="/users" element={<UserManagement users={users} setUsers={setUsers} projects={projects} currentUser={currentUser} fetchInitialData={fetchInitialData} branches={branches && branches.length > 0 ? branches : masterBranches} />} />
          <Route path="/customers" element={<CustomerMasterManager currentUser={currentUser} />} />
          <Route path="/ma-contracts" element={<MAContracts currentUser={currentUser} />} />

          <Route path="/master-management" element={<MasterManagement taskTemplates={taskTemplates} setTaskTemplates={handleSetTaskTemplates} masterProjectTypes={masterProjectTypes} setMasterProjectTypes={handleSetMasterProjectTypes} priceBook={priceBook} setPriceBook={setPriceBook} currentUser={currentUser} fetchInitialData={fetchInitialData} masterBranches={masterBranches} masterZones={masterZones} />} />
          <Route path="/reports" element={<Reports timesheets={timesheets} projects={projects} users={users} currentUser={currentUser} tasks={tasks} costRates={costRates} sprints={sprints} />} />
          <Route path="/settings" element={<Settings taskTemplates={taskTemplates} setTaskTemplates={handleSetTaskTemplates} masterProjectTypes={masterProjectTypes} setMasterProjectTypes={handleSetMasterProjectTypes} permissionSchemes={permissionSchemes} setPermissionSchemes={handleSetPermissionSchemes} currentUser={currentUser} costRates={costRates} setCostRates={handleSetCostRates} systemSettings={systemSettings} setSystemSettings={setSystemSettings} fetchInitialData={fetchInitialData} users={users} setUsers={handleSetUsers} />} />
          <Route path="/help" element={<KnowledgeBase currentUser={currentUser} />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
