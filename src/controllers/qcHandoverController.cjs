const pool = require('../config/db.cjs');

// Get QC Inspections for a project
exports.getProjectQC = async (req, res) => {
  try {
    const { projectId } = req.params;
    const qcResult = await pool.query(
      `SELECT qc.*, u.name as inspector_name_ref
       FROM project_qc_inspections qc
       LEFT JOIN users u ON qc.inspector_id = u.id
       WHERE qc.project_id = $1
       ORDER BY qc.created_at DESC`,
      [projectId]
    );

    const handoverResult = await pool.query(
      `SELECT * FROM project_handovers WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [projectId]
    );

    res.json({
      inspections: qcResult.rows,
      handover: handoverResult.rows[0] || null
    });
  } catch (err) {
    console.error('Error fetching QC data:', err);
    res.status(500).json({ error: 'Failed to fetch QC data' });
  }
};

// Create a new QC Inspection
exports.createQCInspection = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      inspector_id,
      inspector_name,
      inspection_date,
      checklist_items,
      overall_result,
      qc_notes,
      photos,
      created_by
    } = req.body;

    const id = `qc_${Date.now()}`;
    const now = new Date().toISOString();

    const insertResult = await pool.query(
      `INSERT INTO project_qc_inspections
         (id, project_id, inspector_id, inspector_name, inspection_date,
          checklist_items, overall_result, qc_notes, photos, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        id, projectId, inspector_id || null, inspector_name || null,
        inspection_date || now, JSON.stringify(checklist_items || []),
        overall_result || 'Passed', qc_notes || null, photos || [],
        now, created_by || 'System'
      ]
    );

    // Update project execution phase based on QC result
    let phase = 'Ready for Handover';
    let projectStatus = 'QC';
    if (overall_result === 'Failed - Rework Needed') {
      phase = 'Reworking';
      projectStatus = 'In Progress';
    } else if (overall_result === 'Passed') {
      phase = 'Ready for Handover';
      projectStatus = 'QC';
    }

    await pool.query(
      `UPDATE projects SET execution_phase = $1, status = $2, updated_at = $3 WHERE id = $4`,
      [phase, projectStatus, now, projectId]
    );

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error creating QC inspection:', err);
    res.status(500).json({ error: 'Failed to create QC inspection' });
  }
};

// Create / Submit Customer Handover & E-Signature
exports.submitHandover = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      qc_id,
      customer_name,
      customer_phone,
      handover_date,
      customer_satisfied,
      satisfaction_score,
      customer_signature,
      warranty_months,
      warranty_start_date,
      warranty_end_date,
      final_payment_amount,
      final_payment_status,
      settlement_notes,
      technicians_summary,
      created_by
    } = req.body;

    const id = `ho_${Date.now()}`;
    const now = new Date().toISOString();

    const insertResult = await pool.query(
      `INSERT INTO project_handovers
         (id, project_id, qc_id, customer_name, customer_phone, handover_date,
          customer_satisfied, satisfaction_score, customer_signature, warranty_months,
          warranty_start_date, warranty_end_date, final_payment_amount, final_payment_status,
          settlement_notes, technicians_summary, status, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        id, projectId, qc_id || null, customer_name || '', customer_phone || '',
        handover_date || now, customer_satisfied !== false, satisfaction_score || 5,
        customer_signature || null, warranty_months || 12,
        warranty_start_date || now, warranty_end_date || null,
        final_payment_amount || 0, final_payment_status || 'Paid',
        settlement_notes || null, JSON.stringify(technicians_summary || []),
        'Closed & Settled', now, created_by || 'System'
      ]
    );

    // Update Project Status to Completed / Close Job
    await pool.query(
      `UPDATE projects SET status = 'Completed', execution_phase = 'Closed & Settled', updated_at = $1 WHERE id = $2`,
      [now, projectId]
    );

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error submitting handover:', err);
    res.status(500).json({ error: 'Failed to submit handover' });
  }
};
