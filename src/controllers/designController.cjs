const pool = require('../config/db.cjs');

exports.getLeadDesigns = async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await pool.query(
      `SELECT d.*, u.name as designer_name_ref, u.avatar as designer_avatar
       FROM lead_designs d
       LEFT JOIN users u ON d.designer_id = u.id
       WHERE d.lead_id = $1
       ORDER BY d.created_at DESC`,
      [leadId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching designs:', err);
    res.status(500).json({ error: 'Failed to fetch designs' });
  }
};

exports.createDesign = async (req, res) => {
  try {
    const { leadId } = req.params;
    const {
      designer_id,
      designer_name,
      title,
      description,
      version,
      design_type,
      file_urls,
      status,
      created_by
    } = req.body;

    const id = `dsg_${Date.now()}`;
    const now = new Date().toISOString();

    const insertResult = await pool.query(
      `INSERT INTO lead_designs
         (id, lead_id, designer_id, designer_name, title, description, version,
          design_type, file_urls, status, created_at, created_by, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id, leadId, designer_id || null, designer_name || null,
        title || '3D Perspective & Layout', description || null,
        version || 'Rev A', design_type || '3D Perspective',
        file_urls || [], status || 'Pending Customer Review',
        now, created_by || 'System', now
      ]
    );

    // Update lead status to Design Review
    await pool.query(
      `UPDATE leads SET status = 'Design Review', updated_at = $1 WHERE id = $2`,
      [now, leadId]
    );

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error creating design:', err);
    res.status(500).json({ error: 'Failed to create design' });
  }
};

exports.updateDesignStatus = async (req, res) => {
  try {
    const { leadId, designId } = req.params;
    const { status, customer_feedback, approved_by } = req.body;
    const now = new Date().toISOString();

    let approvedAt = null;
    if (status === 'Approved') {
      approvedAt = now;
    }

    const updateResult = await pool.query(
      `UPDATE lead_designs
       SET status = $1,
           customer_feedback = $2,
           approved_by = COALESCE($3, approved_by),
           approved_at = COALESCE($4, approved_at),
           updated_at = $5
       WHERE id = $6 AND lead_id = $7
       RETURNING *`,
      [status, customer_feedback || null, approved_by || null, approvedAt, now, designId, leadId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Design not found' });
    }

    // Auto-update lead status if approved
    if (status === 'Approved') {
      await pool.query(
        `UPDATE leads SET status = 'Design Approved', updated_at = $1 WHERE id = $2`,
        [now, leadId]
      );
    } else if (status === 'Revise Requested') {
      await pool.query(
        `UPDATE leads SET status = 'Design Revision', updated_at = $1 WHERE id = $2`,
        [now, leadId]
      );
    }

    res.json(updateResult.rows[0]);
  } catch (err) {
    console.error('Error updating design status:', err);
    res.status(500).json({ error: 'Failed to update design status' });
  }
};
