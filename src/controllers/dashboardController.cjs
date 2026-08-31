const pool = require('../config/db.cjs');

exports.getDashboardSummary = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear().toString();
    
    // 1. Financial Overview (Yearly)
    // Revenue from Projects (Sum of budget or project_value for Active/Done projects)
    const revenueRes = await pool.query(`
      SELECT SUM(budget) as total_revenue, COUNT(id) as project_count
      FROM projects 
      WHERE start_date LIKE $1 || '%' OR status = 'Done'
    `, [currentYear]);
    const totalRevenue = parseFloat(revenueRes.rows[0].total_revenue || 0);
    const projectCount = parseInt(revenueRes.rows[0].project_count || 0);

    // Pipeline from Quotations (Draft, Sent)
    const pipelineRes = await pool.query(`
      SELECT SUM(grand_total) as pipeline_value, COUNT(id) as quote_count
      FROM quotations 
      WHERE status IN ('Draft', 'Sent')
    `);
    const pipelineValue = parseFloat(pipelineRes.rows[0].pipeline_value || 0);

    // 2. Sales Performance (Leads Funnel)
    const funnelRes = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM leads 
      GROUP BY status
    `);
    
    const funnel = {
      Total: 0,
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Converted: 0,
      Lost: 0
    };
    
    funnelRes.rows.forEach(row => {
      const stat = row.status;
      const count = parseInt(row.count);
      if (funnel[stat] !== undefined) {
        funnel[stat] = count;
      }
      funnel.Total += count;
    });

    const conversionRate = funnel.Total > 0 ? ((funnel.Converted / funnel.Total) * 100).toFixed(1) : 0;

    // 3. Operations Performance (Project Status Breakdown)
    const projectStatusRes = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM projects 
      GROUP BY status
    `);
    
    const projectHealth = {
      Planning: 0,
      Active: 0,
      'In Progress': 0, // Fallback for old status
      Done: 0,
      Delayed: 0
    };
    
    projectStatusRes.rows.forEach(row => {
      const stat = row.status;
      const count = parseInt(row.count);
      if (projectHealth[stat] !== undefined) {
        projectHealth[stat] += count;
      } else {
        // Group unknown active statuses into Active
        if (stat !== 'Done' && stat !== 'Planning') {
          projectHealth.Active += count;
        }
      }
    });

    res.json({
      financial: {
        totalRevenue,
        pipelineValue,
        projectCount,
        year: currentYear
      },
      sales: {
        funnel,
        conversionRate
      },
      operations: {
        projectHealth
      }
    });

  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

exports.getPipelinePerformance = async (req, res) => {
  try {
    const { branch, jobType, timeRange } = req.query;

    // SLA Benchmark Definitions for each of the 12 steps (in days)
    const SLA_CONFIG = [
      { step: 1, id: 's1', name: '1. Lead & Requirement', phase: 'Pre-Construction', targetSlaDays: 1.0, color: '#3b82f6' },
      { step: 2, id: 's2', name: '2. Survey Booking', phase: 'Pre-Construction', targetSlaDays: 1.5, color: '#6366f1' },
      { step: 3, id: 's3', name: '3. Survey QC Inspection', phase: 'Pre-Construction', targetSlaDays: 2.0, color: '#8b5cf6' },
      { step: 4, id: 's4', name: '4. 2D/3D Design Approval', phase: 'Pre-Construction', targetSlaDays: 4.0, color: '#ec4899' },
      { step: 5, id: 's5', name: '5. BOQ Cost Estimation', phase: 'Construction', targetSlaDays: 1.0, color: '#f43f5e' },
      { step: 6, id: 's6', name: '6. Quotation & Contract', phase: 'Construction', targetSlaDays: 3.0, color: '#f97316' },
      { step: 7, id: 's7', name: '7. Down Payment Entry', phase: 'Construction', targetSlaDays: 1.5, color: '#eab308' },
      { step: 8, id: 's8', name: '8. Site Check-In (GPS)', phase: 'Construction', targetSlaDays: 2.0, color: '#84cc16' },
      { step: 9, id: 's9', name: '9. Execution & Timesheet', phase: 'Completion', targetSlaDays: 14.0, color: '#10b981' },
      { step: 10, id: 's10', name: '10. Daily QC & PM Approval', phase: 'Completion', targetSlaDays: 1.0, color: '#14b8a6' },
      { step: 11, id: 's11', name: '11. Final QC & Handover', phase: 'Completion', targetSlaDays: 2.0, color: '#06b6d4' },
      { step: 12, id: 's12', name: '12. Closeout & P&L', phase: 'Completion', targetSlaDays: 2.0, color: '#64748b' }
    ];

    // Fetch all leads with associated timeline data
    let leadQuery = `
      SELECT l.id, l.customer_name, l.customer_phone, l.job_type, l.branch, l.status,
             l.created_at, l.appointment_date, l.appointment_assignee, l.surveyor_id,
             l.survey_date, l.site_visit_approval_status, l.site_visit_approved_at,
             l.project_id, l.updated_at
      FROM leads l
      WHERE 1=1
    `;
    const leadParams = [];
    if (branch && branch !== 'all') {
      leadParams.push(branch);
      leadQuery += ` AND l.branch = $${leadParams.length}`;
    }
    if (jobType && jobType !== 'all') {
      leadParams.push(jobType);
      leadQuery += ` AND l.job_type = $${leadParams.length}`;
    }
    leadQuery += ` ORDER BY l.created_at DESC LIMIT 200`;

    const leadsRes = await pool.query(leadQuery, leadParams);
    const leads = leadsRes.rows;

    // Fetch auxiliary log tables
    const followupsRes = await pool.query(`
      SELECT lead_id, activity_type, appointment_date, created_at, created_by, notes
      FROM lead_followups
      ORDER BY created_at ASC
    `);
    const followupsByLead = {};
    followupsRes.rows.forEach(f => {
      if (!followupsByLead[f.lead_id]) followupsByLead[f.lead_id] = [];
      followupsByLead[f.lead_id].push(f);
    });

    const designsRes = await pool.query(`
      SELECT lead_id, status, created_at, approved_at, approved_by, version
      FROM lead_designs
      ORDER BY created_at ASC
    `);
    const designsByLead = {};
    designsRes.rows.forEach(d => {
      if (!designsByLead[d.lead_id]) designsByLead[d.lead_id] = [];
      designsByLead[d.lead_id].push(d);
    });

    const quotationsRes = await pool.query(`
      SELECT id, lead_id, project_id, status, grand_total, created_at, updated_at, issue_date
      FROM quotations
      ORDER BY created_at ASC
    `);
    const quotationsByLead = {};
    const quotationsByProject = {};
    quotationsRes.rows.forEach(q => {
      if (q.lead_id) {
        if (!quotationsByLead[q.lead_id]) quotationsByLead[q.lead_id] = [];
        quotationsByLead[q.lead_id].push(q);
      }
      if (q.project_id) {
        quotationsByProject[q.project_id] = q;
      }
    });

    const paymentsRes = await pool.query(`
      SELECT lead_id, quotation_id, amount, status, created_at, verified_at, verified_by
      FROM lead_payments
      ORDER BY created_at ASC
    `);
    const paymentsByLead = {};
    const paymentsByQuote = {};
    paymentsRes.rows.forEach(p => {
      if (p.lead_id) {
        if (!paymentsByLead[p.lead_id]) paymentsByLead[p.lead_id] = [];
        paymentsByLead[p.lead_id].push(p);
      }
      if (p.quotation_id) {
        if (!paymentsByQuote[p.quotation_id]) paymentsByQuote[p.quotation_id] = [];
        paymentsByQuote[p.quotation_id].push(p);
      }
    });

    const projectsRes = await pool.query(`
      SELECT id, name, status, start_date, end_date, budget, COALESCE(converted_at, start_date) as created_at, project_type, lead_id, converted_at
      FROM projects
      ORDER BY start_date DESC
    `);
    const projectsById = {};
    projectsRes.rows.forEach(p => {
      projectsById[p.id] = p;
    });

    let checkinsByProject = {};
    try {
      const checkinsRes = await pool.query(`
        SELECT project_id, MIN(check_in_time) as first_checkin, MAX(check_out_time) as last_checkout
        FROM site_checkins
        GROUP BY project_id
      `);
      checkinsRes.rows.forEach(c => {
        checkinsByProject[c.project_id] = c;
      });
    } catch (e) {
      // fallback if site_checkins table empty or structured differently
      checkinsByProject = {};
    }

    const timesheetsRes = await pool.query(`
      SELECT project_id, MIN(date) as first_ts, MAX(date) as last_ts,
             COUNT(*) as ts_count,
             COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
             MIN(approved_at) as first_approved, MAX(approved_at) as last_approved
      FROM timesheets
      GROUP BY project_id
    `);
    const timesheetsByProject = {};
    timesheetsRes.rows.forEach(t => {
      timesheetsByProject[t.project_id] = t;
    });

    let qcByProject = {};
    try {
      const qcRes = await pool.query(`
        SELECT project_id, MIN(created_at) as first_qc, MAX(created_at) as last_qc,
               COUNT(*) as qc_count
        FROM project_qc_inspections
        GROUP BY project_id
      `);
      qcRes.rows.forEach(q => {
        qcByProject[q.project_id] = q;
      });
    } catch (e) {
      qcByProject = {};
    }


    // Helper: calculate days between 2 timestamps
    const diffInDays = (start, end) => {
      if (!start || !end) return null;
      const s = new Date(start).getTime();
      const e = new Date(end).getTime();
      if (isNaN(s) || isNaN(e) || e < s) return null;
      return Math.round(((e - s) / (1000 * 60 * 60 * 24)) * 10) / 10;
    };

    // Process pipeline performance per lead / project
    const stageDurationsCollector = {
      s1: [], s2: [], s3: [], s4: [], s5: [], s6: [],
      s7: [], s8: [], s9: [], s10: [], s11: [], s12: []
    };
    const stageActiveCount = {
      s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0,
      s7: 0, s8: 0, s9: 0, s10: 0, s11: 0, s12: 0
    };
    const stageCompletedCount = {
      s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, s6: 0,
      s7: 0, s8: 0, s9: 0, s10: 0, s11: 0, s12: 0
    };

    const projectTraces = [];

    leads.forEach(lead => {
      const followups = followupsByLead[lead.id] || [];
      const designs = designsByLead[lead.id] || [];
      const quotations = quotationsByLead[lead.id] || [];
      const payments = paymentsByLead[lead.id] || [];
      const project = lead.project_id ? projectsById[lead.project_id] : null;
      const checkin = lead.project_id ? checkinsByProject[lead.project_id] : null;
      const ts = lead.project_id ? timesheetsByProject[lead.project_id] : null;
      const qc = lead.project_id ? qcByProject[lead.project_id] : null;

      const leadCreated = lead.created_at;
      const firstFollowup = followups[0]?.created_at || null;
      const appointmentSet = lead.appointment_date ? (followups.find(f => f.activity_type === 'appointment' || f.survey_date)?.created_at || leadCreated) : null;
      const surveyDone = lead.site_visit_approved_at || followups.find(f => f.activity_type === 'survey_done' || f.new_status === 'Qualified')?.created_at || (lead.status === 'Qualified' ? lead.updated_at : null);
      
      const designCreated = designs[0]?.created_at || null;
      const designApproved = designs.find(d => d.status === 'Approved')?.approved_at || (lead.status === 'Design Approved' ? lead.updated_at : null);

      const quoteCreated = quotations[0]?.created_at || null;
      const quoteApproved = quotations.find(q => q.status === 'Approved' || q.status === 'Converted')?.updated_at || null;

      const paymentVerified = payments.find(p => p.status === 'Verified & Received')?.verified_at || payments[0]?.created_at || null;

      const firstCheckin = checkin?.first_checkin || project?.start_date || null;
      const execCompleted = project?.status === 'Done' || project?.status === 'Delivered' || project?.status === 'Closed' ? (ts?.last_ts || project.end_date || project.updated_at) : null;

      const qcApproved = qc?.last_qc || (ts?.last_approved) || null;
      const handoverSigned = (project?.status === 'Delivered' || project?.status === 'Closed') ? (project.updated_at) : null;
      const projectClosed = project?.status === 'Closed' ? project.updated_at : null;

      // Compute step-by-step durations (in days)
      const d1 = diffInDays(leadCreated, firstFollowup || appointmentSet || lead.updated_at);
      const d2 = diffInDays(firstFollowup || leadCreated, surveyDone || lead.survey_date || lead.appointment_date);
      const d3 = diffInDays(lead.appointment_date || firstFollowup || leadCreated, surveyDone);
      const d4 = diffInDays(surveyDone || designCreated, designApproved);
      const d5 = diffInDays(designApproved || surveyDone, quoteCreated);
      const d6 = diffInDays(quoteCreated, quoteApproved || (project ? project.created_at : null));
      const d7 = diffInDays(quoteApproved || quoteCreated, paymentVerified);
      const d8 = diffInDays(paymentVerified || (project ? project.created_at : null), firstCheckin);
      const d9 = diffInDays(firstCheckin, execCompleted);
      const d10 = diffInDays(ts?.first_ts || firstCheckin, qcApproved || ts?.last_approved);
      const d11 = diffInDays(execCompleted || qcApproved, handoverSigned);
      const d12 = diffInDays(handoverSigned, projectClosed);

      const stepDurations = {
        s1: d1 !== null ? d1 : (lead.status === 'New Lead' ? diffInDays(leadCreated, new Date().toISOString()) : 0.8),
        s2: d2 !== null ? d2 : (lead.status === 'Survey Scheduled' ? diffInDays(leadCreated, new Date().toISOString()) : null),
        s3: d3 !== null ? d3 : null,
        s4: d4 !== null ? d4 : null,
        s5: d5 !== null ? d5 : null,
        s6: d6 !== null ? d6 : null,
        s7: d7 !== null ? d7 : null,
        s8: d8 !== null ? d8 : null,
        s9: d9 !== null ? d9 : null,
        s10: d10 !== null ? d10 : null,
        s11: d11 !== null ? d11 : null,
        s12: d12 !== null ? d12 : null
      };

      // Register collectors
      Object.keys(stepDurations).forEach(k => {
        const val = stepDurations[k];
        if (val !== null && val >= 0) {
          stageDurationsCollector[k].push(val);
          stageCompletedCount[k]++;
        }
      });

      // Determine current stage of lead/project
      let currentStep = 1;
      let currentStepName = '1. Lead & Requirement';
      if (project) {
        if (project.status === 'Closed') { currentStep = 12; currentStepName = '12. Closeout & P&L'; }
        else if (project.status === 'Delivered') { currentStep = 11; currentStepName = '11. Final QC & Handover'; }
        else if (qcApproved) { currentStep = 10; currentStepName = '10. Daily QC & Approval'; }
        else if (firstCheckin) { currentStep = 9; currentStepName = '9. Execution & Timesheet'; }
        else { currentStep = 8; currentStepName = '8. Site Check-In'; }
      } else {
        if (paymentVerified) { currentStep = 7; currentStepName = '7. Down Payment Entry'; }
        else if (quoteApproved || quotations.length > 0) { currentStep = 6; currentStepName = '6. Quotation & Contract'; }
        else if (designs.length > 0) { currentStep = 4; currentStepName = '4. 2D/3D Design Approval'; }
        else if (surveyDone) { currentStep = 3; currentStepName = '3. Survey QC Inspection'; }
        else if (lead.appointment_date || lead.status === 'Survey Scheduled') { currentStep = 2; currentStepName = '2. Survey Booking'; }
        else { currentStep = 1; currentStepName = '1. Lead & Requirement'; }
      }

      const currentStageKey = `s${currentStep}`;
      stageActiveCount[currentStageKey]++;

      // Calculate total cycle time so far for this lead/project
      const totalDays = diffInDays(leadCreated, projectClosed || new Date().toISOString()) || 1.0;

      projectTraces.push({
        id: lead.id,
        projectId: lead.project_id || null,
        customerName: lead.customer_name || 'ลูกค้าทั่วไป',
        phone: lead.customer_phone || '-',
        jobType: lead.job_type || 'Renovation',
        branch: lead.branch || 'HQ0',
        status: lead.status,
        currentStep,
        currentStepName,
        createdAt: lead.created_at,
        totalDurationDays: totalDays,
        stepDurations,
        isSlaBreached: totalDays > 30 // Example threshold for entire cycle
      });
    });

    // Helper: average and median calculation
    const calcStats = (arr, slaTarget) => {
      if (!arr || arr.length === 0) {
        return {
          avg: slaTarget,
          median: slaTarget,
          min: slaTarget,
          max: slaTarget,
          slaBreachRate: 0,
          sampleCount: 0,
          health: 'normal'
        };
      }
      const sum = arr.reduce((acc, v) => acc + v, 0);
      const avg = Math.round((sum / arr.length) * 10) / 10;
      const sorted = [...arr].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const breaches = arr.filter(v => v > slaTarget).length;
      const breachRate = Math.round((breaches / arr.length) * 100);

      let health = 'normal';
      if (avg > slaTarget * 1.35 || breachRate > 40) health = 'bottleneck';
      else if (avg > slaTarget || breachRate > 20) health = 'warning';

      return {
        avg,
        median,
        min,
        max,
        slaBreachRate: breachRate,
        sampleCount: arr.length,
        health
      };
    };

    // Assemble Stage Performance Metrics
    const stagePerformance = SLA_CONFIG.map(cfg => {
      const samples = stageDurationsCollector[cfg.id] || [];
      const stats = calcStats(samples, cfg.targetSlaDays);
      return {
        ...cfg,
        avgDays: stats.avg,
        medianDays: stats.median,
        minDays: stats.min,
        maxDays: stats.max,
        activeCount: stageActiveCount[cfg.id] || 0,
        completedCount: stageCompletedCount[cfg.id] || 0,
        slaBreachRate: stats.slaBreachRate,
        sampleCount: stats.sampleCount,
        health: stats.health
      };
    });

    // Compute Overall Summary Metrics
    const totalPipelinesAnalyzed = projectTraces.length;
    const avgTotalCycleDays = Math.round(
      stagePerformance.reduce((acc, s) => acc + s.avgDays, 0) * 10
    ) / 10;

    const totalTargetSlaDays = SLA_CONFIG.reduce((acc, s) => acc + s.targetSlaDays, 0);
    const compliantStages = stagePerformance.filter(s => s.health === 'normal').length;
    const slaComplianceRate = Math.round((compliantStages / SLA_CONFIG.length) * 100);

    // Identify Fastest, Slowest, and Bottleneck
    const sortedByAvg = [...stagePerformance].sort((a, b) => b.avgDays - a.avgDays);
    const slowestStage = sortedByAvg[0];
    const fastestStage = [...stagePerformance].sort((a, b) => a.avgDays - b.avgDays)[0];
    const bottleneckStage = stagePerformance.find(s => s.health === 'bottleneck') || slowestStage;

    // Grouping by Job Type for Heatmap
    const jobTypeBreakdown = {};
    projectTraces.forEach(t => {
      const jt = t.jobType || 'Other';
      if (!jobTypeBreakdown[jt]) {
        jobTypeBreakdown[jt] = { count: 0, totalDays: 0, breachedCount: 0 };
      }
      jobTypeBreakdown[jt].count++;
      jobTypeBreakdown[jt].totalDays += t.totalDurationDays;
      if (t.isSlaBreached) jobTypeBreakdown[jt].breachedCount++;
    });

    const jobTypeStats = Object.keys(jobTypeBreakdown).map(jt => ({
      jobType: jt,
      count: jobTypeBreakdown[jt].count,
      avgDays: Math.round((jobTypeBreakdown[jt].totalDays / jobTypeBreakdown[jt].count) * 10) / 10,
      breachRate: Math.round((jobTypeBreakdown[jt].breachedCount / jobTypeBreakdown[jt].count) * 100)
    }));

    res.json({
      summary: {
        totalPipelinesAnalyzed,
        avgTotalCycleDays,
        totalTargetSlaDays,
        slaComplianceRate,
        fastestStage: { step: fastestStage.step, name: fastestStage.name, avgDays: fastestStage.avgDays },
        slowestStage: { step: slowestStage.step, name: slowestStage.name, avgDays: slowestStage.avgDays },
        activeBottleneck: { step: bottleneckStage.step, name: bottleneckStage.name, avgDays: bottleneckStage.avgDays, breachRate: bottleneckStage.slaBreachRate }
      },
      stagePerformance,
      jobTypeStats,
      recentTraces: projectTraces.slice(0, 30)
    });

  } catch (err) {
    console.error('Error fetching pipeline performance:', err);
    res.status(500).json({ error: 'Failed to calculate pipeline performance', details: err.message });
  }
};

