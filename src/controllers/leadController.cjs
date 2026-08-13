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
    const { id, customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, notes } = req.body;
    const leadId = id || `lead_${Date.now()}`;
    const now = new Date().toISOString();
    
    const fName = customer_first_name || (customer_name ? customer_name.split(' ')[0] : '');
    const lName = customer_last_name || (customer_name ? customer_name.split(' ').slice(1).join(' ') : '');
    const fullName = customer_name || `${fName} ${lName}`.trim();

    const result = await pool.query(
      `INSERT INTO leads (id, customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, status, notes, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [leadId, fullName, fName, lName, customer_phone, customer_address, customer_latitude || null, customer_longitude || null, map_url || null, job_type, 'New', notes, now, now]
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
    const { customer_name, customer_first_name, customer_last_name, customer_phone, customer_address, customer_latitude, customer_longitude, map_url, job_type, status, appointment_date, appointment_type, appointment_assignee, notes, project_id, coordinator_name, coordinator_phone, coordinator_line_id, surveyor_id, survey_date } = req.body;
    const now = new Date().toISOString();

    const fName = customer_first_name || (customer_name ? customer_name.split(' ')[0] : '');
    const lName = customer_last_name || (customer_name ? customer_name.split(' ').slice(1).join(' ') : '');
    const fullName = customer_name || `${fName} ${lName}`.trim();

    const result = await pool.query(
      `UPDATE leads 
       SET customer_name = $1, customer_first_name = $2, customer_last_name = $3, customer_phone = $4, customer_address = $5, customer_latitude = $6, customer_longitude = $7, map_url = $8, job_type = $9, status = $10, appointment_date = $11, appointment_type = $12, appointment_assignee = $13, notes = $14, updated_at = $15, project_id = COALESCE($16, project_id), coordinator_name = $17, coordinator_phone = $18, coordinator_line_id = $19, surveyor_id = $20, survey_date = $21
       WHERE id = $22 RETURNING *`,
      [fullName, fName, lName, customer_phone, customer_address, customer_latitude || null, customer_longitude || null, map_url || null, job_type, status, appointment_date || null, appointment_type || null, appointment_assignee || null, notes, now, project_id, coordinator_name || null, coordinator_phone || null, coordinator_line_id || null, surveyor_id || null, survey_date || null, id]
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
    await pool.query(
      `UPDATE leads 
       SET status = COALESCE($1, status), appointment_date = $2, appointment_type = $3, appointment_assignee = $4, updated_at = $5, surveyor_id = COALESCE($6, surveyor_id), survey_date = COALESCE($7, survey_date)
       WHERE id = $8`,
      [new_status || null, fullAppointmentStr, activity_type, assignee_name, now, surveyor_id || null, survey_date || null, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error adding followup:', err);
    res.status(500).json({ error: 'Failed to add followup' });
  }
};
