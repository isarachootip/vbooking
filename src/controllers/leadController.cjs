const pool = require('../config/db.cjs');

exports.getLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default to 50 items per page
    const offset = (page - 1) * limit;

    // Get total count for frontend pagination UI
    const countResult = await pool.query('SELECT COUNT(*) FROM leads');
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Fetch paginated data
    const result = await pool.query(
      'SELECT * FROM leads ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: {
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: totalPages
      }
    });
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
};

exports.createLead = async (req, res) => {
  try {
    const { id, customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, notes, sales_contact_id } = req.body;
    const leadId = id || `lead_${Date.now()}`;
    const now = new Date().toISOString();
    
    const fName = customer_first_name || (customer_name ? customer_name.split(' ')[0] : '');
    const lName = customer_last_name || (customer_name ? customer_name.split(' ').slice(1).join(' ') : '');
    const fullName = customer_name || `${fName} ${lName}`.trim();

    const result = await pool.query(
      `INSERT INTO leads (id, customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, status, notes, created_at, updated_at, sales_contact_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [leadId, fullName, fName, lName, customer_phone, customer_address, customer_latitude || null, customer_longitude || null, map_url || null, job_type, 'New', notes, now, now, sales_contact_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error creating lead:', err);
    res.status(500).json({ error: 'Failed to create lead' });
  }
};

exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, status, appointment_date, appointment_type, appointment_assignee, notes, project_id, coordinator_name, coordinator_phone, coordinator_line_id, surveyor_id, survey_date, sales_contact_id } = req.body;
    const now = new Date().toISOString();

    const fName = customer_first_name || (customer_name ? customer_name.split(' ')[0] : '');
    const lName = customer_last_name || (customer_name ? customer_name.split(' ').slice(1).join(' ') : '');
    const fullName = customer_name || `${fName} ${lName}`.trim();

    const result = await pool.query(
      `UPDATE leads 
       SET customer_name = $1, customer_first_name = $2, customer_last_name = $3, customer_phone = $4, customer_address = $5, customer_latitude = $6, customer_longitude = $7, map_url = $8, job_type = $9, status = $10, appointment_date = $11, appointment_type = $12, appointment_assignee = $13, notes = $14, updated_at = $15, project_id = COALESCE($16, project_id), coordinator_name = $17, coordinator_phone = $18, coordinator_line_id = $19, surveyor_id = $20, survey_date = $21, sales_contact_id = COALESCE($23, sales_contact_id)
       WHERE id = $22 RETURNING *`,
      [fullName, fName, lName, customer_phone, customer_address, customer_latitude || null, customer_longitude || null, map_url || null, job_type, status, appointment_date || null, appointment_type || null, appointment_assignee || null, notes, now, project_id, coordinator_name || null, coordinator_phone || null, coordinator_line_id || null, surveyor_id || null, survey_date || null, id, sales_contact_id || null]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lead:', err);
    res.status(500).json({ error: 'Failed to update lead' });
  }
};

exports.getFollowups = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM lead_followups WHERE lead_id = $1 ORDER BY created_at DESC', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching followups:', err);
    res.status(500).json({ error: 'Failed to fetch followups' });
  }
};

exports.addFollowup = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      activity_type, appointment_date, appointment_time, assignee_name, 
      site_coordinator_name, site_coordinator_phone, site_coordinator_line_id, site_map_url,
      notes, new_status, created_by, surveyor_id, survey_date
    } = req.body;
    const followupId = `flw_${Date.now()}`;
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO lead_followups (id, lead_id, activity_type, appointment_date, appointment_time, assignee_name, site_coordinator_name, site_coordinator_phone, site_coordinator_line_id, site_map_url, notes, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [followupId, id, activity_type, appointment_date || null, appointment_time || null, assignee_name || null, site_coordinator_name || null, site_coordinator_phone || null, site_coordinator_line_id || null, site_map_url || null, notes || null, now, created_by || 'Admin']
    );

    const fullAppointmentStr = appointment_date ? `${appointment_date} ${appointment_time || ''}`.trim() : null;
    const isSiteVisit = activity_type && (activity_type.includes('site') || activity_type.includes('ลงพื้นที่'));
    const initialApprovalStatus = isSiteVisit ? 'Pending' : 'None';

    let lat = null;
    let lng = null;
    if (site_map_url) {
      const match = site_map_url.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      }
    }

    await pool.query(
      `UPDATE leads 
       SET status = COALESCE($1, status), 
           appointment_date = $2, 
           appointment_type = $3, 
           appointment_assignee = $4, 
           updated_at = $5, 
           surveyor_id = COALESCE($6, surveyor_id), 
           survey_date = COALESCE($7, survey_date),
           site_visit_approval_status = CASE WHEN $8 = 'Pending' THEN 'Pending' ELSE site_visit_approval_status END,
           coordinator_name = COALESCE($9, coordinator_name),
           coordinator_phone = COALESCE($10, coordinator_phone),
           coordinator_line_id = COALESCE($11, coordinator_line_id),
           map_url = COALESCE($12, map_url),
           customer_latitude = COALESCE($13, customer_latitude),
           customer_longitude = COALESCE($14, customer_longitude)
       WHERE id = $15`,
      [
        new_status || null, fullAppointmentStr, activity_type, assignee_name, now, 
        surveyor_id || null, survey_date || null, initialApprovalStatus,
        site_coordinator_name || null, site_coordinator_phone || null, site_coordinator_line_id || null,
        site_map_url || null, lat, lng,
        id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding followup:', err);
    res.status(500).json({ error: 'Failed to add followup' });
  }
};

exports.getSiteVisitApprovals = async (req, res) => {
  try {
    const { status, branch } = req.query;
    let query = `
      SELECT l.*, 
             u.name as sales_contact_name,
             u.avatar as sales_contact_avatar
      FROM leads l
      LEFT JOIN users u ON l.sales_contact_id = u.id
      WHERE (
        l.site_visit_approval_status IN ('Pending', 'Approved', 'Rejected')
        OR l.appointment_type LIKE '%site%'
        OR l.appointment_type LIKE '%ลงพื้นที่%'
        OR (l.appointment_date IS NOT NULL AND l.appointment_date != '')
      )
    `;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'All') {
      query += ` AND (l.site_visit_approval_status = $${paramIndex} OR ($${paramIndex} = 'Pending' AND (l.site_visit_approval_status = 'Pending' OR l.site_visit_approval_status = 'None' OR l.site_visit_approval_status IS NULL)))`;
      params.push(status);
      paramIndex++;
    }

    if (branch && branch !== 'All') {
      query += ` AND l.branch = $${paramIndex}`;
      params.push(branch);
      paramIndex++;
    }

    query += ` ORDER BY l.updated_at DESC, l.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching site visit approvals:', err);
    res.status(500).json({ error: 'Failed to fetch site visit approvals' });
  }
};

exports.approveSiteVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      approval_status, 
      sales_contact_id, 
      sales_contact_name, 
      approved_by, 
      approval_notes,
      appointment_date,
      appointment_time
    } = req.body;

    const now = new Date().toISOString();

    let fullAppointmentStr = null;
    if (appointment_date) {
      fullAppointmentStr = `${appointment_date} ${appointment_time || ''}`.trim();
    }

    const newStatus = approval_status === 'Approved' ? 'Qualified' : null;

    const updateResult = await pool.query(
      `UPDATE leads
       SET site_visit_approval_status = $1,
           site_visit_approved_by = $2,
           site_visit_approved_at = $3,
           site_visit_approval_notes = $4,
           sales_contact_id = COALESCE($5, sales_contact_id),
           appointment_assignee = COALESCE($6, appointment_assignee),
           appointment_date = COALESCE($7, appointment_date),
           status = COALESCE($8, status),
           updated_at = $9
       WHERE id = $10
       RETURNING *`,
      [
        approval_status || 'Approved',
        approved_by || 'GM สาขา',
        now,
        approval_notes || null,
        sales_contact_id || null,
        sales_contact_name || null,
        fullAppointmentStr,
        newStatus,
        now,
        id
      ]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const followupId = `flw_gm_${Date.now()}`;
    const activityTitle = approval_status === 'Approved' 
      ? `อนุมัตินัดหมายลงพื้นที่`
      : approval_status === 'Rejected'
      ? `ปฏิเสธนัดหมายลงพื้นที่`
      : `ปรับปรุงข้อมูลนัดหมาย`;

    const noteContent = [
      approval_status === 'Approved' ? `GM อนุมัติ & มอบหมาย Sales: ${sales_contact_name || 'พนักงานขาย'}` : `GM ปฏิเสธนัดหมาย`,
      approval_notes ? `บันทึกคำสั่งการ: ${approval_notes}` : null
    ].filter(Boolean).join(' | ');

    await pool.query(
      `INSERT INTO lead_followups (id, lead_id, activity_type, appointment_date, appointment_time, assignee_name, notes, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        followupId,
        id,
        activityTitle,
        appointment_date || null,
        appointment_time || null,
        sales_contact_name || null,
        noteContent || 'อนุมัติการออกพบลูกค้าหน้างาน',
        now,
        approved_by || 'GM สาขา'
      ]
    );

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Error approving site visit:', err);
    res.status(500).json({ error: 'Failed to approve site visit' });
  }
};

// =============================================
// SITE VISIT RESULTS
// =============================================

exports.getVisitResults = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, u.name as visited_by_name_ref, u.avatar as visited_by_avatar
       FROM lead_site_visit_results r
       LEFT JOIN users u ON r.visited_by_id = u.id
       WHERE r.lead_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching visit results:', err);
    res.status(500).json({ error: 'Failed to fetch visit results' });
  }
};

exports.addVisitResult = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      followup_id,
      visited_by_id,
      visited_by_name,
      visit_date,
      visit_result,
      site_condition,
      work_scope_summary,
      estimated_budget,
      customer_interest,
      customer_decision,
      next_action,
      next_action_date,
      internal_notes,
      photos,
      created_by
    } = req.body;

    const resultId = `svr_${Date.now()}`;
    const now = new Date().toISOString();

    const insertResult = await pool.query(
      `INSERT INTO lead_site_visit_results
         (id, lead_id, followup_id, visited_by_id, visited_by_name, visit_date, visit_result,
          site_condition, work_scope_summary, estimated_budget, customer_interest, customer_decision,
          next_action, next_action_date, internal_notes, photos, created_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        resultId, id, followup_id || null, visited_by_id || null,
        visited_by_name || null, visit_date || now, visit_result || 'Visited',
        site_condition || null, work_scope_summary || null,
        estimated_budget ? parseFloat(estimated_budget) : null,
        customer_interest || null, customer_decision || null,
        next_action || null, next_action_date || null,
        internal_notes || null, photos || [],
        now, created_by || 'System'
      ]
    );

    // Auto-update lead status based on next_action
    let newLeadStatus = null;
    if (next_action === 'send_quotation') newLeadStatus = 'Pending Quote';
    else if (next_action === 'close_lost') newLeadStatus = 'Lost';

    if (newLeadStatus) {
      await pool.query(
        `UPDATE leads SET status = $1, updated_at = $2 WHERE id = $3`,
        [newLeadStatus, now, id]
      );
    } else {
      // Just bump updated_at
      await pool.query(`UPDATE leads SET updated_at = $1 WHERE id = $2`, [now, id]);
    }

    // Auto-create followup if next_action requires follow-up
    if (next_action === 'follow_up_call' || next_action === 'reschedule_visit') {
      const flwId = `flw_svr_${Date.now()}`;
      const actType = next_action === 'reschedule_visit' ? 'นัด Visit ใหม่' : 'โทรติดตาม';
      await pool.query(
        `INSERT INTO lead_followups (id, lead_id, activity_type, appointment_date, notes, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [flwId, id, actType, next_action_date || null,
         `Auto-created จากผลการ Visit: ${visit_result}`, now, created_by || 'System']
      );
    }

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error adding visit result:', err);
    res.status(500).json({ error: 'Failed to add visit result' });
  }
};

exports.updateVisitResult = async (req, res) => {
  try {
    const { id, resultId } = req.params;
    const {
      visit_result, site_condition, work_scope_summary, estimated_budget,
      customer_interest, customer_decision, next_action, next_action_date,
      internal_notes, photos
    } = req.body;
    const now = new Date().toISOString();

    const result = await pool.query(
      `UPDATE lead_site_visit_results
       SET visit_result = COALESCE($1, visit_result),
           site_condition = $2,
           work_scope_summary = $3,
           estimated_budget = $4,
           customer_interest = $5,
           customer_decision = COALESCE($6, customer_decision),
           next_action = COALESCE($7, next_action),
           next_action_date = $8,
           internal_notes = $9,
           photos = COALESCE($10, photos)
       WHERE id = $11 AND lead_id = $12
       RETURNING *`,
      [
        visit_result || null, site_condition || null, work_scope_summary || null,
        estimated_budget ? parseFloat(estimated_budget) : null,
        customer_interest || null, customer_decision || null,
        next_action || null, next_action_date || null,
        internal_notes || null, photos || null,
        resultId, id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Visit result not found' });
    await pool.query(`UPDATE leads SET updated_at = $1 WHERE id = $2`, [now, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating visit result:', err);
    res.status(500).json({ error: 'Failed to update visit result' });
  }
};

exports.getLeadTimeline = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Lead info
    const leadRes = await pool.query('SELECT * FROM leads WHERE id = $1', [id]);
    if (leadRes.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const lead = leadRes.rows[0];

    // 2. Followups
    const followupsRes = await pool.query('SELECT * FROM lead_followups WHERE lead_id = $1 ORDER BY created_at ASC', [id]);
    
    // 3. Site visit results
    const visitsRes = await pool.query('SELECT * FROM lead_site_visit_results WHERE lead_id = $1 ORDER BY created_at ASC', [id]);
    
    // 4. Designs
    const designsRes = await pool.query('SELECT * FROM lead_designs WHERE lead_id = $1 ORDER BY created_at ASC', [id]);
    
    // 5. Payments
    const paymentsRes = await pool.query('SELECT * FROM lead_payments WHERE lead_id = $1 ORDER BY created_at ASC', [id]);

    // Build timeline events array
    const events = [];

    // Milestone 1: Lead Creation
    if (lead.created_at) {
      events.push({
        id: `evt_create_${lead.id}`,
        step: 1,
        type: 'LEAD_CREATED',
        title: 'สร้าง Lead / รับข้อมูลลูกค้าเข้าสู่ระบบ',
        timestamp: lead.created_at,
        actor: lead.created_by || 'ผู้บันทึกข้อมูล',
        description: `ประเภทงาน: ${lead.job_type || 'ทั่วไป'} | ที่อยู่: ${lead.customer_address || 'ไม่ระบุ'}`,
        status: 'completed',
        color: '#2563eb'
      });
    }

    // Milestone 2: Followups & Appointments
    followupsRes.rows.forEach(f => {
      events.push({
        id: `evt_flw_${f.id}`,
        step: 2,
        type: 'FOLLOWUP_RECORDED',
        title: `บันทึกติดตาม: ${f.activity_type}`,
        timestamp: f.created_at,
        actor: f.created_by || f.assignee_name || 'แอดมิน',
        description: f.notes || (f.appointment_date ? `นัดหมายวันที่ ${f.appointment_date} ${f.appointment_time || ''}` : 'บันทึกการติดต่อ'),
        appointment_date: f.appointment_date,
        appointment_time: f.appointment_time,
        status: 'completed',
        color: '#9333ea'
      });
    });

    // Milestone 3: GM Site Visit Approval
    if (lead.site_visit_approved_at) {
      events.push({
        id: `evt_gm_${lead.id}`,
        step: 3,
        type: 'GM_APPROVAL',
        title: lead.site_visit_approval_status === 'Approved' ? 'GM อนุมัตินัดหมายลงพื้นที่' : 'GM ไม่อนุมัตินัดหมายลงพื้นที่',
        timestamp: lead.site_visit_approved_at,
        actor: lead.site_visit_approved_by || 'GM สาขา',
        description: lead.site_visit_approval_notes || (lead.site_visit_approval_status === 'Approved' ? 'อนุมัติการออกพบลูกค้าหน้างานและมอบหมายทีมงาน' : 'ปฏิเสธคำขอ'),
        status: lead.site_visit_approval_status === 'Approved' ? 'completed' : 'rejected',
        color: lead.site_visit_approval_status === 'Approved' ? '#059669' : '#dc2626'
      });
    }

    // Milestone 4: Site Visit Results
    visitsRes.rows.forEach(v => {
      events.push({
        id: `evt_svr_${v.id}`,
        step: 4,
        type: 'SITE_VISIT_RESULT',
        title: `บันทึกผลการเข้า Visit Site: ${v.visit_result}`,
        timestamp: v.created_at,
        actual_visit_date: v.visit_date,
        actor: v.visited_by_name || v.created_by || 'ช่างหน้างาน',
        description: v.work_scope_summary || v.internal_notes || `สภาพหน้างาน: ${v.site_condition || '-'} | งบประมาณประเมิน: ${v.estimated_budget ? v.estimated_budget.toLocaleString() + ' บาท' : '-'}`,
        status: 'completed',
        color: '#1e40af'
      });
    });

    // Milestone 5: Designs & Approvals
    designsRes.rows.forEach(d => {
      events.push({
        id: `evt_des_create_${d.id}`,
        step: 5,
        type: 'DESIGN_CREATED',
        title: `สร้างแบบแปลน / 3D (${d.version}): ${d.title}`,
        timestamp: d.created_at,
        actor: d.designer_name || d.created_by || 'Designer',
        description: d.description || `ประเภท: ${d.design_type} (สถานะ: ${d.status})`,
        status: 'completed',
        color: '#0284c7'
      });

      if (d.approved_at) {
        events.push({
          id: `evt_des_appr_${d.id}`,
          step: 5,
          type: 'DESIGN_APPROVED',
          title: `ตรวจรับและอนุมัติแบบ (${d.version})`,
          timestamp: d.approved_at,
          actor: d.approved_by || 'ลูกค้า / ผู้มีอำนาจอนุมัติ',
          description: d.customer_feedback || 'แบบได้รับการยืนยันและอนุมัติเรียบร้อย',
          status: 'completed',
          color: '#059669'
        });
      }
    });

    // Milestone 6: Payments & Deposits
    paymentsRes.rows.forEach(p => {
      events.push({
        id: `evt_pay_${p.id}`,
        step: 6,
        type: 'PAYMENT_RECEIVED',
        title: `บันทึกการชำระเงินมัดจำ: ${Number(p.amount).toLocaleString()} บาท`,
        timestamp: p.created_at,
        payment_date: p.payment_date,
        actor: p.created_by || 'ฝ่ายการเงิน',
        description: `วิธีชำระ: ${p.payment_method} | สถานะ: ${p.status}`,
        status: 'completed',
        color: '#059669'
      });

      if (p.verified_at) {
        events.push({
          id: `evt_pay_ver_${p.id}`,
          step: 6,
          type: 'PAYMENT_VERIFIED',
          title: `ตรวจสอบและยืนยันยอดเงินมัดจำสำเร็จ`,
          timestamp: p.verified_at,
          actor: p.verified_by || 'ฝ่ายการเงิน / ตรวจสอบสลิป',
          description: `ยืนยันยอด ${Number(p.amount).toLocaleString()} บาท เรียบร้อย`,
          status: 'completed',
          color: '#059669'
        });
      }
    });

    // Milestone 7: Converted to Project
    if (lead.status === 'Converted' || lead.project_id) {
      events.push({
        id: `evt_conv_${lead.id}`,
        step: 7,
        type: 'CONVERTED_TO_PROJECT',
        title: 'แปลงเป็นโครงการติดตั้งสำเร็จ (Project Activated)',
        timestamp: lead.updated_at || lead.created_at,
        actor: 'ระบบ / ผู้จัดการโครงการ',
        description: lead.project_id ? `รหัสโครงการ: ${lead.project_id}` : 'เปิดโครงการติดตั้งในระบบเรียบร้อย',
        status: 'completed',
        color: '#10b981'
      });
    }

    // Sort chronologically by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      lead_id: lead.id,
      customer_name: lead.customer_name,
      current_status: lead.status,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      events: events
    });
  } catch (err) {
    console.error('Error fetching lead timeline:', err);
    res.status(500).json({ error: 'Failed to fetch lead timeline' });
  }
};
