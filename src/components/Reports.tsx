import { useState } from 'react';
import { BarChart3, TrendingUp, Download, Printer, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Briefcase, Clock, Activity, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { User, Project, TimesheetEntry, Task, CostRate, Sprint } from '../types';
import { formatToDDMMYYYY, sortTimesheetsByLastUpdate } from '../utils';
import { CustomDateInput } from './CustomDateInput';

interface ReportsProps {
  timesheets: TimesheetEntry[];
  projects: Project[];
  users: User[];
  currentUser: User | null;
  tasks: Task[];
  costRates: CostRate[];
  sprints: Sprint[];
}

export const Reports = ({ timesheets, projects, users, currentUser, tasks, costRates, sprints }: ReportsProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'personal' | 'project_cost' | 'pm_portfolio'>('overview');
  
  // Common states
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Selected Month (for Personal and Project dashboards)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Cost Report States
  const [costReportType, setCostReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'>('monthly');
  const [costDate, setCostDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  const isAdmin = currentUser?.globalRole === 'Admin' || currentUser?.globalRole === 'Manager';
  const isProjectPM = projects.some(p => p.members && p.members.some((m: any) => m.userId === currentUser?.id && (m.role === 'PM' || m.role === 'Team Lead' || m.role === 'Leader')));
  const showPmPortfolioTab = isAdmin || isProjectPM;
  
  // Filter timesheets to only show the user's own if they are not Admin/Manager
  const visibleTimesheets = isAdmin
    ? timesheets
    : timesheets.filter(ts => ts.userId === currentUser?.id);

  // Default to the month of the latest timesheet entry, or June 2026
  const [calendarDate, setCalendarDate] = useState<Date>(() => {
    if (visibleTimesheets.length > 0) {
      const dates = visibleTimesheets.map(t => new Date(t.date));
      const latestDate = new Date(Math.max(...dates.map(d => d.getTime())));
      if (!isNaN(latestDate.getTime())) {
        return new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
      }
    }
    return new Date(2026, 5, 1);
  });

  const prevMonth = () => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const getCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ dateStr: string | null; dayNum: number | null }> = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: day });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ dateStr: null, dayNum: null });
    }

    return cells;
  };

  // ── Helper to calculate timesheet entry cost ──
  const getEntryCost = (entry: TimesheetEntry) => {
    const proj = projects.find(p => p.id === entry.projectId);
    if (!proj) return entry.hours * 812.5; // fallback
    const member = proj.members?.find(m => m.userId === entry.userId);
    const role = member ? member.role : '';
    const rate = costRates.find(r => r.roleName.toLowerCase() === role.toLowerCase());
    const ratePerHour = rate ? rate.ratePerHour : 812.5; // Default fallback to 6,500/day = 812.5/hr
    return entry.hours * ratePerHour;
  };

  // ── Calculations for OVERVIEW Tab ──
  const filteredTimesheets = visibleTimesheets.filter(ts => {
    if (selectedProject !== 'all' && ts.projectId !== selectedProject) return false;
    if (selectedUser !== 'all' && ts.userId !== selectedUser) return false;
    if (startDate && ts.date < startDate) return false;
    if (endDate && ts.date > endDate) return false;
    return true;
  });

  const sortedTimesheets = sortTimesheetsByLastUpdate(filteredTimesheets);

  const totalHours = filteredTimesheets.reduce((sum, entry) => sum + entry.hours, 0);
  const approvedHours = filteredTimesheets
    .filter(ts => ts.status === 'Approved')
    .reduce((sum, ts) => sum + ts.hours, 0);

  // const _utilizationPct = totalHours > 0 ? Math.round((approvedHours / totalHours) * 100) : 0;

  // ── Cost & Budget Calculations ──
  const totalCost = filteredTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);
  const relevantProjects = selectedProject === 'all' 
    ? projects 
    : projects.filter(p => p.id === selectedProject);
  const totalBudget = relevantProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalCost / totalBudget) * 100) : 0;
  const isOverBudget = totalCost > totalBudget && totalBudget > 0;

  const totalAllHours = visibleTimesheets.reduce((s, t) => s + t.hours, 0);
  const projectStats = projects.map(project => {
    const hours = filteredTimesheets
      .filter(ts => ts.projectId === project.id)
      .reduce((sum, ts) => sum + ts.hours, 0);
    return {
      name: project.name,
      hours,
      percentage: totalAllHours > 0 ? Math.round((hours / totalAllHours) * 100) : 0,
    };
  }).filter(p => p.hours > 0);

  const employeeStats = users.map(user => {
    const hours = filteredTimesheets
      .filter(ts => ts.userId === user.id)
      .reduce((sum, ts) => sum + ts.hours, 0);
    return { ...user, hours };
  }).filter(e => e.hours > 0);

  // ── Cost Movement Data Calculation ──
  const getCostMovementData = () => {
    let startD = new Date();
    startD.setDate(startD.getDate() - 14); // Default last 15 days
    let endD = new Date();

    if (startDate) startD = new Date(startDate);
    if (endDate) endD = new Date(endDate);
    
    // Prevent too many data points (cap at 60 days)
    const diffTime = Math.abs(endD.getTime() - startD.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 60) {
      startD = new Date(endD);
      startD.setDate(startD.getDate() - 60);
    }

    const data = [];
    const curr = new Date(startD);

    while (curr <= endD) {
      const dateStr = curr.toISOString().split('T')[0];
      const dayTimesheets = filteredTimesheets.filter(ts => ts.date === dateStr);
      
      const dayHours = dayTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
      const dayCost = dayTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);
      
      data.push({
        date: dateStr,
        displayDate: `${curr.getDate()} ${curr.toLocaleString('en-US', { month: 'short' })}`,
        LoggedHours: Number(dayHours.toFixed(2)),
        Cost: Number(dayCost.toFixed(2))
      });
      curr.setDate(curr.getDate() + 1);
    }
    return data;
  };
  const costMovementData = getCostMovementData();

  // ── Calculations for PERSONAL Tab ──
  const activePersonalUser = selectedUser === 'all' ? (currentUser?.id || '') : selectedUser;
  const personalTimesheets = timesheets.filter(ts => {
    return ts.userId === activePersonalUser && ts.date.slice(0, 7) === selectedMonth;
  });

  const personalTotalHours = personalTimesheets.reduce((sum, e) => sum + e.hours, 0);
  const personalTasks = tasks.filter(t => t.assigneeId === activePersonalUser);
  const personalCompletedTasksCount = personalTasks.filter(t => t.status.toLowerCase() === 'done' || t.status.toLowerCase() === 'completed').length;
  
  // Avg hours / logged day
  const uniqueLoggedDays = Array.from(new Set(personalTimesheets.map(t => t.date)));
  const personalAvgHours = uniqueLoggedDays.length > 0 ? (personalTotalHours / uniqueLoggedDays.length).toFixed(1) : '0';

  // Longest streak in selected month
  const getPersonalStreak = () => {
    if (uniqueLoggedDays.length === 0) return 0;
    const sortedDates = uniqueLoggedDays.map(d => new Date(d).getTime()).sort((a, b) => a - b);
    let maxStreak = 0;
    let currentStreak = 0;
    let prevTime = 0;

    for (const time of sortedDates) {
      if (prevTime === 0) {
        currentStreak = 1;
      } else {
        const diffDays = (time - prevTime) / (1000 * 60 * 60 * 24);
        if (diffDays <= 1.1) { // consecutive days (allowing slight DST variance)
          currentStreak++;
        } else {
          maxStreak = Math.max(maxStreak, currentStreak);
          currentStreak = 1;
        }
      }
      prevTime = time;
    }
    return Math.max(maxStreak, currentStreak);
  };
  const personalStreak = getPersonalStreak();

  // Project distribution for Personal user
  const personalProjectDistribution = projects.map(proj => {
    const hours = personalTimesheets.filter(ts => ts.projectId === proj.id).reduce((sum, ts) => sum + ts.hours, 0);
    return {
      name: proj.name,
      hours,
      percentage: personalTotalHours > 0 ? Math.round((hours / personalTotalHours) * 100) : 0
    };
  }).filter(p => p.hours > 0).sort((a, b) => b.hours - a.hours);

  // Time pattern (Avg start / end)
  const getPersonalTimePattern = () => {
    const timedEntries = personalTimesheets.filter(ts => ts.startTime && ts.endTime);
    if (timedEntries.length === 0) return 'No time data';
    let startMinSum = 0;
    let endMinSum = 0;
    timedEntries.forEach(entry => {
      const [sh, sm] = entry.startTime!.split(':').map(Number);
      const [eh, em] = entry.endTime!.split(':').map(Number);
      startMinSum += sh * 60 + sm;
      endMinSum += eh * 60 + em;
    });
    const avgStart = startMinSum / timedEntries.length;
    const avgEnd = endMinSum / timedEntries.length;

    const formatMin = (m: number) => {
      const hStr = String(Math.floor(m / 60)).padStart(2, '0');
      const mStr = String(Math.round(m % 60)).padStart(2, '0');
      return `${hStr}:${mStr}`;
    };
    return `${formatMin(avgStart)} - ${formatMin(avgEnd)}`;
  };
  const personalTimePattern = getPersonalTimePattern();

  // Daily hours bar chart data
  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };
  const daysInMonthArray = Array.from({ length: getDaysInMonth(selectedMonth) }, (_, i) => i + 1);

  // ── Calculations for PROJECT COST Tab ──
  const activeProjectId = selectedProject === 'all' ? (projects[0]?.id || '') : selectedProject;
  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectTimesheets = timesheets.filter(ts => {
    if (selectedProject !== 'all' && ts.projectId !== selectedProject) return false;
    // For the table, we'll group by the selected type, but we still filter the KPI cards by costDate.
    // Wait, let's keep the filter for KPIs.
    if (costReportType === 'daily') {
      return ts.date === costDate;
    } else if (costReportType === 'weekly') {
      // costDate is '2026-W26'
      return getWeekString(ts.date) === costDate;
    } else if (costReportType === 'monthly') {
      return ts.date.slice(0, 7) === costDate.slice(0, 7);
    } else if (costReportType === 'yearly') {
      return ts.date.slice(0, 4) === costDate.slice(0, 4);
    } else {
      return true; // 'all'
    }
  });

  const projectTotalHours = projectTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
  const projectTotalCost = projectTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);
  const projectBudget = selectedProject === 'all'
    ? projects.reduce((sum, p) => sum + (p.budget || 0), 0)
    : (activeProject?.budget || 0);
  const projectBurnRate = projectBudget > 0 ? Math.round((projectTotalCost / projectBudget) * 100) : 0;

  // ── Preset colors for the line chart ──
  const chartColors = [
    '#38bdf8', // sky-400
    '#a78bfa', // violet-400
    '#f472b6', // pink-400
    '#fb7185', // rose-400
    '#34d399', // emerald-400
    '#fbbf24', // amber-400
    '#60a5fa', // blue-400
    '#f87171', // red-400
  ];

  // Helper to get month name
  const getMonthName = (dateStr: string) => {
    if (!dateStr || dateStr.length < 7) return '';
    const monthIndex = parseInt(dateStr.slice(5, 7), 10) - 1;
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return monthNames[monthIndex] || '';
  };

  // Helper to get ISO week string (e.g., 2026-W26)
  const getWeekString = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  };

  // Safe costDate
  const safeCostDate = costDate || new Date().toISOString().split('T')[0];
  const selectedYear = safeCostDate.slice(0, 4);
  const selectedMonthStr = safeCostDate.slice(0, 7);

  // Month-to-Date (MTD) actual cost
  const mtdTimesheets = timesheets.filter(ts => 
    (selectedProject === 'all' || ts.projectId === selectedProject) &&
    ts.date.slice(0, 7) === selectedMonthStr &&
    ts.date <= safeCostDate
  );
  const mtdCost = mtdTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);

  // Year-to-Date (YTD) actual cost
  const ytdTimesheets = timesheets.filter(ts => 
    (selectedProject === 'all' || ts.projectId === selectedProject) &&
    ts.date.slice(0, 4) === selectedYear &&
    ts.date <= safeCostDate
  );
  const ytdCost = ytdTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);

  // ── Resource Trend Data Calculation for LINE CHART ──
  const getResourceTrendData = () => {
    // Find users who logged time on this project in the active period
    const activePeriodUserIds = Array.from(new Set(
      projectTimesheets.map(ts => ts.userId)
    ));
    const chartUsers = users.filter(u => activePeriodUserIds.includes(u.id));

    if (chartUsers.length === 0) return { trendData: [], chartUsers };

    const trendData: any[] = [];

    if (costReportType === 'daily') {
      // 14-day trend ending on safeCostDate
      const endDateObj = new Date(safeCostDate);
      const startDateObj = new Date(safeCostDate);
      startDateObj.setDate(startDateObj.getDate() - 13); // 14 days total
      
      const curr = new Date(startDateObj);
      while (curr <= endDateObj) {
        const dateStr = curr.toISOString().split('T')[0];
        const dayTimesheets = timesheets.filter(ts => (selectedProject === 'all' || ts.projectId === selectedProject) && ts.date === dateStr);
        
        const point: any = {
          date: dateStr,
          displayDate: `${curr.getDate()} ${getMonthName(dateStr)}`,
        };
        
        chartUsers.forEach(user => {
          point[user.name] = dayTimesheets
            .filter(ts => ts.userId === user.id)
            .reduce((sum, ts) => sum + ts.hours, 0);
        });
        
        trendData.push(point);
        curr.setDate(curr.getDate() + 1);
      }
    } else if (costReportType === 'monthly') {
      // Day by day of the selected month
      const [year, month] = selectedMonthStr.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${selectedMonthStr}-${String(d).padStart(2, '0')}`;
        const dayTimesheets = timesheets.filter(ts => (selectedProject === 'all' || ts.projectId === selectedProject) && ts.date === dateStr);
        
        const point: any = {
          day: d,
          displayDate: `${d} ${getMonthName(dateStr)}`,
        };
        
        chartUsers.forEach(user => {
          point[user.name] = dayTimesheets
            .filter(ts => ts.userId === user.id)
            .reduce((sum, ts) => sum + ts.hours, 0);
        });
        
        trendData.push(point);
      }
    } else if (costReportType === 'yearly') {
      // Month by month of the selected year
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let m = 1; m <= 12; m++) {
        const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
        const monthTimesheets = timesheets.filter(ts => 
          (selectedProject === 'all' || ts.projectId === selectedProject) && 
          ts.date.slice(0, 7) === monthStr
        );
        
        const point: any = {
          month: m,
          displayDate: monthNames[m - 1],
        };
        
        chartUsers.forEach(user => {
          point[user.name] = monthTimesheets
            .filter(ts => ts.userId === user.id)
            .reduce((sum, ts) => sum + ts.hours, 0);
        });
        
        trendData.push(point);
      }
    }

    return { trendData, chartUsers };
  };

  const { trendData, chartUsers } = getResourceTrendData();

  // Sprint breakdown for the project
  const projectSprints = tasks
    .filter(t => (selectedProject === 'all' || t.projectId === selectedProject) && t.sprintId)
    .reduce((acc: Record<string, { name: string; hours: number; cost: number }>, task) => {
      const tsForTask = projectTimesheets.filter(ts => ts.taskId === task.id);
      const hours = tsForTask.reduce((sum, ts) => sum + ts.hours, 0);
      const cost = tsForTask.reduce((sum, ts) => sum + getEntryCost(ts), 0);
      
      if (hours > 0) {
        const sprintObj = sprints.find(s => s.id === task.sprintId);
        const sprintName = sprintObj ? sprintObj.name : `Sprint ${task.sprintId}`;
        const displayName = selectedProject === 'all'
          ? `${projects.find(p => p.id === task.projectId)?.name || ''}: ${sprintName}`
          : sprintName;

        if (!acc[task.sprintId!]) {
          acc[task.sprintId!] = { name: displayName, hours: 0, cost: 0 };
        }
        acc[task.sprintId!].hours += hours;
        acc[task.sprintId!].cost += cost;
      }
      return acc;
    }, {});

  // Task cost breakdown for the cycle graph (donut chart)
  const rawTaskCostData = tasks
    .filter(t => selectedProject === 'all' || t.projectId === selectedProject)
    .map(task => {
      const tsForTask = projectTimesheets.filter(ts => ts.taskId === task.id);
      const hours = tsForTask.reduce((sum, ts) => sum + ts.hours, 0);
      const cost = tsForTask.reduce((sum, ts) => sum + getEntryCost(ts), 0);
      return {
        name: selectedProject === 'all' 
          ? `[${projects.find(p => p.id === task.projectId)?.name || ''}] ${task.title}`
          : task.title,
        value: cost,
        hours
      };
    })
    .filter(item => item.value > 0);

  // Add unassigned timesheet entries to taskCostData
  const unassignedTimesheets = projectTimesheets.filter(ts => !ts.taskId);
  const unassignedHours = unassignedTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
  const unassignedCost = unassignedTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);
  
  if (unassignedCost > 0) {
    rawTaskCostData.push({
      name: 'Unassigned / General Project Work',
      value: unassignedCost,
      hours: unassignedHours
    });
  }

  const taskCostData = rawTaskCostData.sort((a, b) => b.value - a.value);

  const totalTaskCost = taskCostData.reduce((sum, item) => sum + item.value, 0);

  // ── Export CSV ──
  const exportCSV = () => {
    const headers = ['Date', 'User', 'Project', 'Hours', 'Cost (THB)', 'Description', 'Status'];
    const rows = sortedTimesheets.map(ts => [
      ts.date,
      users.find(u => u.id === ts.userId)?.name || '',
      projects.find(p => p.id === ts.projectId)?.name || '',
      ts.hours,
      getEntryCost(ts).toFixed(2),
      `"${(ts.description || '').replace(/"/g, '""')}"`,
      ts.status,
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet-cost-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Export PDF (print) ──
  const exportPDF = () => {
    window.print();
  };

  const inputStyle: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '0.375rem',
    padding: '0.35rem 0.6rem',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
  };

  const selectStyle: React.CSSProperties = {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '0.375rem',
    padding: '0.35rem 0.6rem',
    fontSize: '0.8rem',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .glass-panel { background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; }
          .reports-row { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1024px) {
          .reports-lower-grid { grid-template-columns: 1fr !important; }
          .grid-3col { grid-template-columns: 1fr !important; }
        }
        .calendar-cell-active {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.15s ease;
        }
        .calendar-cell-active:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .chart-bar-hover:hover .chart-tooltip {
          display: block !important;
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* ── Header ── */}
        <div className="flex-between">
          <div>
            <h1 className="text-gradient" style={{ marginBottom: '0.5rem' }}>HR &amp; Cost Reports</h1>
            <p style={{ color: 'var(--text-secondary)' }}>Analytical dashboards detailing work allocation, personal metrics, and project financial effort.</p>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              style={{
                background: 'var(--accent-secondary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
              className="hover-lift"
              onClick={exportCSV}
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              style={{
                background: 'var(--accent-primary)',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
              className="hover-lift"
              onClick={exportPDF}
            >
              <Printer size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* ── Tabs Restructure ── */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }} className="no-print">
          <button 
            onClick={() => setActiveTab('overview')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'overview' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'overview' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'overview' ? 600 : 400
            }}
          >
            📊 Overview
          </button>
          <button 
            onClick={() => setActiveTab('personal')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'personal' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'personal' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'personal' ? 600 : 400
            }}
          >
            👤 Personal Performance
          </button>
          <button 
            onClick={() => setActiveTab('project_cost')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'project_cost' ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === 'project_cost' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: activeTab === 'project_cost' ? 600 : 400
            }}
          >
            📁 Project Cost
          </button>
          {showPmPortfolioTab && (
            <button 
              onClick={() => setActiveTab('pm_portfolio')}
              style={{
                background: 'transparent',
                border: 'none',
                color: activeTab === 'pm_portfolio' ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === 'pm_portfolio' ? '2px solid var(--accent-primary)' : '2px solid transparent',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontWeight: activeTab === 'pm_portfolio' ? 600 : 400
              }}
            >
              💼 PM Portfolio
            </button>
          )}
        </div>

        {/* ── TAB CONTENT: 📊 OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Filters */}
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <div className="glass-panel" style={{ padding: '0.25rem', display: 'flex', gap: '0.25rem' }}>
                {(['daily', 'monthly', 'yearly'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    style={{
                      background: reportType === type ? 'var(--bg-tertiary)' : 'transparent',
                      color: reportType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      transition: 'all var(--transition-fast)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="glass-panel" style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Project:</span>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  style={{ ...selectStyle, border: 'none', background: 'transparent' }}
                >
                  <option value="all" style={{ background: 'var(--bg-secondary)' }}>All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)' }}>{p.name}</option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div className="glass-panel" style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>User:</span>
                  <select
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    style={{ ...selectStyle, border: 'none', background: 'transparent' }}
                  >
                    <option value="all" style={{ background: 'var(--bg-secondary)' }}>All Users</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id} style={{ background: 'var(--bg-secondary)' }}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>From:</span>
                <CustomDateInput
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>To:</span>
                <CustomDateInput
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={inputStyle}
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.8rem', padding: '0 0.25rem' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Total Logged Hours</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalHours}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>hrs ({filteredTimesheets.length} entries)</span>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Approved Hours</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{approvedHours}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>hrs / {totalHours} total</span>
                </div>
              </div>
              <div className="glass-panel" style={{ padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Total Cost vs Budget</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: isOverBudget ? 'var(--status-error)' : 'var(--text-primary)' }}>
                    ฿{totalCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                  {totalBudget > 0 && (
                    <span style={{ fontSize: '0.8rem', color: isOverBudget ? 'var(--status-error)' : 'var(--text-muted)' }}>
                      / ฿{totalBudget.toLocaleString()}
                    </span>
                  )}
                </div>
                {totalBudget > 0 && (
                  <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden', marginTop: '4px' }}>
                    <div style={{ height: '100%', width: `${Math.min(budgetUsedPct, 100)}%`, background: isOverBudget ? 'var(--status-error)' : 'var(--accent-primary)', borderRadius: '999px', transition: 'width 0.4s' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Graphics */}
            <div className="reports-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} /> Time Allocation by Project
                </h3>
                {projectStats.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No data for current filter</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {projectStats.map(proj => (
                      <div key={proj.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.875rem' }}>
                          <span style={{ fontWeight: 500 }}>{proj.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{proj.hours} hrs ({proj.percentage}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${proj.percentage}%`, background: 'var(--accent-primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} /> Resource Hours Summary
                </h3>
                {employeeStats.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No data for current filter</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {employeeStats.map(emp => (
                      <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <img src={emp.avatar} alt={emp.name} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{emp.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{emp.department}</div>
                          </div>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.925rem' }}>{emp.hours} hrs</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Logged Hours and Cost Movement Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LineChartIcon size={18} color="var(--accent-primary)" /> Logged Hours & Cost Movement (Daily)
              </h3>
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={costMovementData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis 
                      dataKey="displayDate" 
                      stroke="var(--text-secondary)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="var(--text-secondary)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      allowDecimals={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--text-secondary)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(val) => `฿${val.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                      itemStyle={{ fontWeight: 600 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
                    <Line yAxisId="left" type="monotone" name="Logged Hours" dataKey="LoggedHours" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" name="Cost (THB)" dataKey="Cost" stroke="#ffc658" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Calendar & Details Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.125rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={18} color="var(--accent-primary)" />
                    Timesheet Calendar
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button type="button" onClick={prevMonth} className="hover-lift" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, minWidth: '100px', textAlign: 'center' }}>
                      {(() => {
                        const monthNames = [
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ];
                        return `${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
                      })()}
                    </span>
                    <button type="button" onClick={nextMonth} className="hover-lift" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '0.3rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center', marginBottom: '0.25rem' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <span key={d} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d}</span>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
                    {getCalendarDays().map((cell, idx) => {
                      const dayEntries = cell.dateStr ? filteredTimesheets.filter(ts => ts.date === cell.dateStr) : [];
                      const dailyTotal = dayEntries.reduce((sum, e) => sum + e.hours, 0);

                      return (
                        <div 
                          key={idx} 
                          className={cell.dayNum ? "calendar-cell-active" : ""}
                          style={{ 
                            minHeight: '85px', 
                            borderRadius: 'var(--radius-sm)', 
                            padding: '0.35rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            background: cell.dayNum ? undefined : 'rgba(255,255,255,0.005)',
                            border: cell.dayNum ? undefined : '1px solid transparent'
                          }}
                        >
                          {cell.dayNum && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: dailyTotal > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {cell.dayNum}
                              </span>
                              {dailyTotal > 0 && (
                                <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.25rem', background: 'rgba(99, 102, 241, 0.15)', color: 'rgba(129, 140, 248, 1)', borderRadius: '3px', fontWeight: 700 }}>
                                  {dailyTotal}h
                                </span>
                              )}
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', flex: 1, maxHeight: '55px' }}>
                            {dayEntries.map(entry => {
                              const proj = projects.find(p => p.id === entry.projectId);
                              const projName = proj ? proj.name : 'Unknown';
                              const user = users.find(u => u.id === entry.userId);
                              const userName = user ? user.name.split(' ')[0] : 'Unknown';
                              const displayLabel = `${isAdmin && selectedUser === 'all' ? `${userName}: ` : ''}${entry.description || projName}`;

                              const statusBg: Record<string, string> = {
                                Draft: 'rgba(107, 114, 128, 0.1)',
                                Pending: 'rgba(245, 158, 11, 0.1)',
                                Approved: 'rgba(16, 185, 129, 0.1)',
                                Rejected: 'rgba(239, 68, 68, 0.1)',
                              };
                              const statusBorder: Record<string, string> = {
                                Draft: 'rgba(107, 114, 128, 0.3)',
                                Pending: 'rgba(245, 158, 11, 0.4)',
                                Approved: 'rgba(16, 185, 129, 0.4)',
                                Rejected: 'rgba(239, 68, 68, 0.4)',
                              };
                              const statusColor: Record<string, string> = {
                                Draft: 'rgba(156, 163, 175, 1)',
                                Pending: 'rgba(251, 191, 36, 1)',
                                Approved: 'rgba(52, 211, 153, 1)',
                                Rejected: 'rgba(248, 113, 113, 1)',
                              };

                              return (
                                <div 
                                  key={entry.id}
                                  style={{
                                    fontSize: '0.62rem',
                                    padding: '0.15rem 0.25rem',
                                    borderRadius: '3px',
                                    background: statusBg[entry.status],
                                    borderLeft: `2.5px solid ${statusColor[entry.status]}`,
                                    borderRight: `1px solid ${statusBorder[entry.status]}`,
                                    borderTop: `1px solid ${statusBorder[entry.status]}`,
                                    borderBottom: `1px solid ${statusBorder[entry.status]}`,
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'default'
                                  }}
                                  title={`${userName} - ${projName}: ${entry.hours}h - ${entry.description} (${entry.status})`}
                                >
                                  {displayLabel}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Timesheet Details</h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    {sortedTimesheets.slice(0, 50).length} of {sortedTimesheets.length} entries
                  </span>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10 }}>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Date</th>
                        {isAdmin && (
                          <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>User</th>
                        )}
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Project</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Hours</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Description</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedTimesheets.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No timesheet entries match the current filters.
                          </td>
                        </tr>
                      ) : (
                        sortedTimesheets.slice(0, 50).map((ts, idx) => {
                          const user = users.find(u => u.id === ts.userId);
                          const project = projects.find(p => p.id === ts.projectId);
                          const statusColor: Record<string, string> = {
                            Draft: 'rgba(107,114,128,0.7)',
                            Pending: 'rgba(245,158,11,0.8)',
                            Approved: 'rgba(16,185,129,0.8)',
                            Rejected: 'rgba(239,68,68,0.8)',
                          };
                          return (
                            <tr
                              key={ts.id}
                              style={{
                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                              }}
                            >
                              <td style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}>{formatToDDMMYYYY(ts.date)}</td>
                              {isAdmin && (
                                <td style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    {user?.avatar && (
                                      <img src={user.avatar} alt={user.name} style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                                    )}
                                    <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={user?.name}>{user?.name || ts.userId}</span>
                                  </div>
                                </td>
                              )}
                              <td style={{ padding: '0.45rem 0.75rem', whiteSpace: 'nowrap', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={project?.name || ts.projectId}>
                                {project?.name || ts.projectId}
                              </td>
                              <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>{ts.hours}h</td>
                              <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ts.description}>
                                {ts.description || '—'}
                              </td>
                              <td style={{ padding: '0.45rem 0.75rem' }}>
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  padding: '0.15rem 0.45rem',
                                  borderRadius: '999px',
                                  background: statusColor[ts.status] || 'rgba(107,114,128,0.7)',
                                  color: 'white',
                                }}>
                                  {ts.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: 👤 PERSONAL PERFORMANCE ── */}
        {activeTab === 'personal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Filters */}
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              {isAdmin && (
                <div className="glass-panel" style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Employee:</span>
                  <select
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    style={{ ...selectStyle, border: 'none', background: 'transparent' }}
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id} style={{ background: 'var(--bg-secondary)' }}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="glass-panel" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Month Hours</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{personalTotalHours} hrs</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in {selectedMonth}</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Tasks Completed</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{personalCompletedTasksCount}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total assigned done tasks</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Avg Hours / Workday</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-info)' }}>{personalAvgHours} hrs</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Over {uniqueLoggedDays.length} active days</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Work Streak</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-warning)' }}>{personalStreak} Days</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Longest consecutive streak</span>
              </div>
            </div>

            {/* Daily Hours Visual Bar Chart */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={18} color="var(--accent-primary)" /> Daily Logged Time Allocation ({selectedMonth})
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '0.25rem', background: 'var(--bg-tertiary)', padding: '1.5rem 1rem 0.5rem 1rem', borderRadius: 'var(--radius-md)', overflowX: 'auto', border: '1px solid var(--border-color)', position: 'relative' }}>
                {/* Horizontal reference lines */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '25%', borderBottom: '1px dashed rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderBottom: '1px dashed rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: '75%', borderBottom: '1px dashed rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
                
                {daysInMonthArray.map(day => {
                  const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                  const dayHours = personalTimesheets.filter(ts => ts.date === dateStr).reduce((s, ts) => s + ts.hours, 0);
                  const barHeight = Math.min(100, Math.round((dayHours / 12) * 100)); // reference 12 hours max
                  
                  return (
                    <div 
                      key={day} 
                      className="chart-bar-hover"
                      style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        height: '100%', 
                        justifyContent: 'flex-end',
                        position: 'relative',
                        minWidth: '22px'
                      }}
                    >
                      {/* Bar */}
                      <div style={{
                        height: `${barHeight}%`,
                        width: '100%',
                        background: dayHours > 0 ? 'var(--accent-primary)' : 'rgba(255,255,255,0.02)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.3s ease',
                        cursor: 'pointer',
                        boxShadow: dayHours > 0 ? '0 0 10px rgba(124, 58, 237, 0.2)' : 'none'
                      }} />
                      {/* Day Label */}
                      <span style={{ fontSize: '0.65rem', color: dayHours > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{day}</span>
                      
                      {/* Tooltip */}
                      {dayHours > 0 && (
                        <div 
                          className="chart-tooltip"
                          style={{
                            display: 'none',
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            zIndex: 10,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                          }}
                        >
                          {dayHours} hrs ({dateStr})
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Allocation & Start/End time pattern */}
            <div className="reports-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              {/* Project distribution */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={18} /> Projects Duration Allocation
                </h3>
                
                {personalProjectDistribution.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                    No hours logged on any projects in this month.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {personalProjectDistribution.map(proj => (
                      <div key={proj.name} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600 }}>{proj.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{proj.hours} hrs ({proj.percentage}%)</span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${proj.percentage}%`, background: 'var(--accent-primary)', borderRadius: '999px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Pattern card */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} /> Work Habit Pattern
                </h3>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyItems: 'center', justifyContent: 'center', gap: '1.5rem', background: 'var(--bg-tertiary)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Average Active Shift</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-info)' }}>{personalTimePattern}</span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Unique Active Days</span>
                    <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>{uniqueLoggedDays.length} Days / {daysInMonthArray.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: 📁 PROJECT COST ── */}
        {activeTab === 'project_cost' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Filters */}
            <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <div className="glass-panel" style={{ padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Project:</span>
                <select
                  value={selectedProject}
                  onChange={e => setSelectedProject(e.target.value)}
                  style={{ ...selectStyle, border: 'none', background: 'transparent' }}
                >
                  <option value="all" style={{ background: 'var(--bg-secondary)' }}>All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} style={{ background: 'var(--bg-secondary)' }}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="glass-panel" style={{ padding: '0.25rem', display: 'flex', gap: '0.25rem' }}>
                {(['daily', 'weekly', 'monthly', 'yearly', 'all'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setCostReportType(type);
                      if (type === 'weekly' && !costDate.includes('W')) {
                        setCostDate(getWeekString(new Date().toISOString().split('T')[0]));
                      } else if (type === 'monthly' && costDate.includes('W')) {
                        setCostDate(new Date().toISOString().split('T')[0].slice(0, 7) + '-01');
                      }
                    }}
                    style={{
                      background: costReportType === type ? 'var(--bg-tertiary)' : 'transparent',
                      color: costReportType === type ? 'var(--text-primary)' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      transition: 'all var(--transition-fast)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {costReportType !== 'all' && (
                <div className="glass-panel" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {costReportType === 'daily' ? 'Date:' : costReportType === 'weekly' ? 'Week:' : costReportType === 'monthly' ? 'Month:' : 'Year:'}
                  </span>
                {costReportType === 'daily' && (
                  <CustomDateInput
                    value={costDate}
                    onChange={e => setCostDate(e.target.value)}
                    style={inputStyle}
                  />
                )}
                {costReportType === 'weekly' && (
                  <input
                    type="week"
                    value={costDate}
                    onChange={e => setCostDate(e.target.value)}
                    style={inputStyle}
                  />
                )}
                {costReportType === 'monthly' && (
                  <input
                    type="month"
                    value={costDate.slice(0, 7)}
                    onChange={e => {
                      const newDate = e.target.value;
                      if (newDate) setCostDate(`${newDate}-01`);
                    }}
                    style={inputStyle}
                  />
                )}
                {costReportType === 'yearly' && (
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={costDate.slice(0, 4)}
                    onChange={e => {
                      const newYear = e.target.value;
                      if (newYear && newYear.length === 4) setCostDate(`${newYear}-01-01`);
                    }}
                    style={{ ...inputStyle, width: '100px' }}
                  />
                )}
              </div>
              )}
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Total Effort</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{projectTotalHours} hrs</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{costReportType === 'all' ? 'All time logged' : `Logged in ${costReportType === 'daily' ? costDate : costReportType === 'monthly' ? costDate.slice(0, 7) : costReportType === 'weekly' ? costDate : costDate.slice(0, 4)}`}</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Selected Period Cost</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                  ฿{projectTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on configured rates</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Month-to-Date Cost (MTD)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-info)' }}>
                  ฿{mtdCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From 1st to {safeCostDate.slice(8, 10)} {getMonthName(safeCostDate)}</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Year-to-Date Cost (YTD)</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                  ฿{ytdCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From Jan 1st to {safeCostDate}</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Project Budget</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {projectBudget > 0 ? `฿${projectBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Initial allocation</span>
              </div>
              <div className="glass-panel" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Budget Burn Rate</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem', fontWeight: 700, color: projectBurnRate > 90 ? 'var(--accent-danger)' : 'var(--text-primary)' }}>{projectBurnRate}%</span>
                  {projectBudget > 0 && (
                    <div style={{ flex: 1, height: '4px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, projectBurnRate)}%`, background: projectBurnRate > 90 ? 'var(--accent-danger)' : 'var(--accent-primary)', borderRadius: '999px' }} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Line Chart: Resource Effort Trend ── */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <LineChartIcon size={18} color="var(--accent-primary)" /> Team Resource Effort Trend (Logged Hours)
              </h3>
              {chartUsers.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                  No timesheet entries found for this project in the selected period.
                </div>
              ) : (
                <div style={{ width: '100%', height: '320px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="var(--text-secondary)" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="var(--text-secondary)" 
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        itemStyle={{ fontWeight: 600 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                      {chartUsers.map((user, idx) => (
                        <Line 
                          key={user.id}
                          type="monotone" 
                          name={user.name} 
                          dataKey={user.name} 
                          stroke={chartColors[idx % chartColors.length]} 
                          strokeWidth={2.5} 
                          dot={{ r: 3 }} 
                          activeDot={{ r: 5 }} 
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* ── Table: Actual Cost & Effort Summary (Replaces Resource Role table) ── */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Briefcase size={18} color="var(--accent-primary)" /> Actual Cost &amp; Effort Summary ({costReportType})
              </h3>
              
              <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#2F75B5', borderBottom: '1px solid var(--border-color)', color: 'white' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Period</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Logged Hours</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Actual Mandays</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Actual Cost (THB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Group timesheets based on costReportType
                      const grouped: Record<string, { hours: number; cost: number }> = {};
                      
                      // Filter by project only (ignoring costDate so we can see all periods of that type, 
                      // or just show periods that match the costDate range).
                      // We will show the breakdown for ALL timesheets in this project to give a proper view, 
                      // or if costDate is selected, maybe we just show the periods in that costDate?
                      // The user wants a Time-based breakdown. Let's group ALL project timesheets by the selected dimension.
                      const baseTimesheets = selectedProject === 'all' ? timesheets : timesheets.filter(ts => ts.projectId === selectedProject);

                      baseTimesheets.forEach(ts => {
                        let key = ts.date;
                        if (costReportType === 'weekly') {
                          key = getWeekString(ts.date);
                        } else if (costReportType === 'monthly') {
                          key = ts.date.slice(0, 7);
                        } else if (costReportType === 'yearly') {
                          key = ts.date.slice(0, 4);
                        } else if (costReportType === 'all') {
                          key = 'All Time';
                        }
                        
                        if (!grouped[key]) {
                          grouped[key] = { hours: 0, cost: 0 };
                        }
                        grouped[key].hours += ts.hours;
                        grouped[key].cost += getEntryCost(ts);
                      });

                      const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
                      let totalHours = 0;
                      let totalCost = 0;

                      const rows = sortedKeys.map(key => {
                        const { hours, cost } = grouped[key];
                        totalHours += hours;
                        totalCost += cost;
                        const mandays = hours / 8;
                        
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)' }}>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{key}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{hours > 0 ? hours.toFixed(1) : '0'}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>{mandays > 0 ? mandays.toFixed(2) : '0.00'}</td>
                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600, color: cost > 0 ? 'var(--accent-secondary)' : 'inherit' }}>
                              ฿{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      });

                      const totalMandays = totalHours / 8;

                      return (
                        <>
                          {rows.length > 0 ? rows : (
                            <tr>
                              <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No data available</td>
                            </tr>
                          )}
                          {/* Total Row */}
                          <tr style={{ background: 'rgba(47, 117, 181, 0.1)', fontWeight: 700, borderBottom: '2px solid #2F75B5', borderTop: '2px solid #2F75B5' }}>
                            <td style={{ padding: '0.85rem 1rem', textTransform: 'uppercase', color: 'var(--text-primary)' }}>Total</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{totalHours > 0 ? totalHours.toFixed(1) : '0'}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>{totalMandays.toFixed(2)}</td>
                            <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: 'var(--accent-secondary)' }}>
                              ฿{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sprints Cost Breakdown, Task Detail Costs, and Task Cost Graph Grid */}
            <div className="reports-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '2rem' }}>
              {/* Sprint Cost */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={18} /> Sprint Cost Allocation
                </h3>
                
                <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Sprint</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Actual Hours</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Actual Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(projectSprints).length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No sprint time logged in this month.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(projectSprints).map(([sprintId, sprint]) => (
                          <tr key={sprintId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{sprint.name}</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{sprint.hours} hrs</td>
                            <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                              ฿{sprint.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Task Cost Details */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} /> Task Cost breakdown
                </h3>

                <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Task Title</th>
                        <th style={{ padding: '0.5rem 0.75rem' }}>Assignee Role</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Logged Hours</th>
                        <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const projectTasks = tasks.filter(t => selectedProject === 'all' || t.projectId === selectedProject);
                        const taskRows = projectTasks.map(task => {
                          const tsForTask = projectTimesheets.filter(ts => ts.taskId === task.id);
                          const hours = tsForTask.reduce((sum, ts) => sum + ts.hours, 0);
                          const cost = tsForTask.reduce((sum, ts) => sum + getEntryCost(ts), 0);

                          if (hours === 0) return null;

                          const assignee = users.find(u => u.id === task.assigneeId);
                          const proj = projects.find(p => p.id === task.projectId);
                          const member = proj?.members?.find(m => m.userId === task.assigneeId);
                          const roleName = member?.role || '—';
                          const displayTitle = selectedProject === 'all' ? `[${proj?.name || ''}] ${task.title}` : task.title;

                          return (
                            <tr key={task.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'var(--text-primary)' }} title={displayTitle}>
                                {displayTitle.length > 28 ? `${displayTitle.slice(0, 28)}...` : displayTitle}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)' }}>
                                {assignee ? `${assignee.name.split(' ')[0]} (${roleName})` : 'Unassigned'}
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>{hours} hrs</td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>
                                ฿{cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        }).filter(Boolean);

                        // Include unassigned row if there are any unassigned timesheets in this period
                        const unassignedTimesheetsInProject = projectTimesheets.filter(ts => !ts.taskId);
                        if (unassignedTimesheetsInProject.length > 0) {
                          const unassignedHours = unassignedTimesheetsInProject.reduce((sum, ts) => sum + ts.hours, 0);
                          const unassignedCost = unassignedTimesheetsInProject.reduce((sum, ts) => sum + getEntryCost(ts), 0);
                          taskRows.push(
                            <tr key="unassigned-row" style={{ borderBottom: '1px solid var(--border-color)', fontStyle: 'italic' }}>
                              <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                                Unassigned / General Project Work
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)' }}>
                                —
                              </td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: 'var(--text-muted)' }}>{unassignedHours} hrs</td>
                              <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)' }}>
                                ฿{unassignedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        }

                        if (taskRows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No tasks with logged hours in this month.
                              </td>
                            </tr>
                          );
                        }
                        return taskRows;
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Task Cost Distribution Donut Chart */}
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <PieChartIcon size={18} color="var(--accent-primary)" /> Task Cost Distribution
                </h3>
                {taskCostData.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    No task cost data available.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <div style={{ position: 'relative', width: '100%', height: '220px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <PieChart width={260} height={220}>
                        <Pie
                          data={taskCostData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {taskCostData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`฿${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Cost']}
                          contentStyle={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                        />
                      </PieChart>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Task Cost</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                          ฿{totalTaskCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    </div>
                    {/* Compact Legend */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.75rem', maxHeight: '100px', overflowY: 'auto', paddingRight: '4px' }}>
                      {(() => {
                        const topTasks = taskCostData.slice(0, 4);
                        const otherTasks = taskCostData.slice(4);
                        const otherCost = otherTasks.reduce((sum, item) => sum + item.value, 0);
                        const legendItems = [...topTasks];
                        if (otherCost > 0) {
                          legendItems.push({
                            name: 'Others',
                            value: otherCost,
                            hours: otherTasks.reduce((sum, item) => sum + item.hours, 0)
                          });
                        }
                        return legendItems.map((item, idx) => {
                          const percentage = ((item.value / totalTaskCost) * 100).toFixed(1);
                          const color = item.name === 'Others' ? 'var(--text-muted)' : chartColors[idx % chartColors.length];
                          return (
                            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }} title={item.name}>
                                  {item.name}
                                </span>
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginLeft: '0.5rem', flexShrink: 0 }}>
                                {percentage}%
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: 💼 PM PORTFOLIO ── */}
        {activeTab === 'pm_portfolio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>PM Portfolio Dashboard</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Consolidated overview of all projects you manage, including resource allocations, logged hours, and budget utilization.
              </p>
            </div>

            {/* Portfolio KPI Cards */}
            {(() => {
              const managedProjects = projects.filter(p => isAdmin || p.members?.some(m => m.userId === currentUser?.id && (m.role === 'PM' || m.role === 'Team Lead' || m.role === 'Leader')));
              const pmTimesheets = timesheets.filter(ts => managedProjects.some(p => p.id === ts.projectId));
              const totalPmHours = pmTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
              const totalPmCost = pmTimesheets.reduce((sum, ts) => sum + getEntryCost(ts), 0);

              const allPmMembers = new Set<string>();
              managedProjects.forEach(p => p.members?.forEach(m => allPmMembers.add(m.userId)));
              const uniquePmResourcesCount = allPmMembers.size;

              return (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Managed Projects</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{managedProjects.length}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active or Planning</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Total Resources</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-info)' }}>{uniquePmResourcesCount} members</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Across managed team</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Total Logged Effort</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{totalPmHours.toLocaleString()} hrs</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From all project timesheets</span>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>Consolidated Actual Cost</span>
                      <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--accent-secondary)' }}>
                        ฿{totalPmCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on resource billing rates</span>
                    </div>
                  </div>

                  {managedProjects.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No projects are currently managed by you as PM.
                    </div>
                  ) : (
                    <>
                      {/* Project Performance & Cost Table */}
                      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                          <Briefcase size={18} color="var(--accent-primary)" /> Project Portfolios & Budgets
                        </h3>
                        <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '1rem' }}>Project Name</th>
                                <th style={{ padding: '1rem', width: '150px' }}>Completion Progress</th>
                                <th style={{ padding: '1rem', width: '100px', textAlign: 'center' }}>Resources</th>
                                <th style={{ padding: '1rem', width: '120px', textAlign: 'center' }}>Logged Hours</th>
                                <th style={{ padding: '1rem', width: '150px', textAlign: 'right' }}>Actual Cost</th>
                                <th style={{ padding: '1rem', width: '220px' }}>Budget Utilization</th>
                              </tr>
                            </thead>
                            <tbody>
                              {managedProjects.map(proj => {
                                const projTimesheets = timesheets.filter(ts => ts.projectId === proj.id);
                                const projHours = projTimesheets.reduce((s, ts) => s + ts.hours, 0);
                                const projCost = projTimesheets.reduce((s, ts) => s + getEntryCost(ts), 0);
                                const projBudget = proj.budget || 0;
                                const utilization = projBudget > 0 ? (projCost / projBudget) * 100 : 0;
                                const isOver = projCost > projBudget && projBudget > 0;

                                // Completion % = Done tasks / total tasks
                                const projTasks = tasks.filter(t => t.projectId === proj.id);
                                const doneTasks = projTasks.filter(t => t.status === 'Done');
                                const completionPct = projTasks.length > 0 ? Math.round((doneTasks.length / projTasks.length) * 100) : 0;

                                return (
                                  <tr key={proj.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{proj.name}</span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>Status: {proj.status}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ flex: 1, height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                          <div style={{ width: `${completionPct}%`, height: '100%', background: 'var(--accent-secondary)' }} />
                                        </div>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '32px' }}>{completionPct}%</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500 }}>
                                      {proj.members?.length || 0}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 500 }}>
                                      {projHours} hrs
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>
                                      ฿{projCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                      {projBudget > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                            <span style={{ color: isOver ? 'var(--accent-danger)' : 'var(--text-secondary)' }}>
                                              {Math.round(utilization)}% used
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>Budget: ฿{projBudget.toLocaleString()}</span>
                                          </div>
                                          <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ 
                                              width: `${Math.min(100, utilization)}%`, 
                                              height: '100%', 
                                              background: isOver ? 'var(--accent-danger)' : 'var(--accent-primary)' 
                                            }} />
                                          </div>
                                        </div>
                                      ) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Budget Configured</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Detailed Team Resource Allocation per Project */}
                      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                          <Activity size={18} color="var(--accent-info)" /> Project Resource Allocations & Hours
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
                          {managedProjects.map(proj => {
                            const projMembers = proj.members || [];
                            const projTimesheets = timesheets.filter(ts => ts.projectId === proj.id);

                            return (
                              <div key={proj.id} className="glass-panel" style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--accent-primary)' }}>
                                  {proj.name}
                                </h4>
                                {projMembers.length === 0 ? (
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                                    No members assigned to this project.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {projMembers.map(m => {
                                      const u = users.find(usr => usr.id === m.userId);
                                      const userHours = projTimesheets
                                        .filter(ts => ts.userId === m.userId)
                                        .reduce((sum, ts) => sum + ts.hours, 0);

                                      if (!u) return null;
                                      return (
                                        <div key={m.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.35rem 0', borderBottom: '1px dashed rgba(255,255,255,0.02)' }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                            <img 
                                              src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                                              alt={u.name} 
                                              style={{ width: '24px', height: '24px', borderRadius: '50%' }} 
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Role: {m.role}</span>
                                            </div>
                                          </div>
                                          <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {userHours} hrs logged
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
};
