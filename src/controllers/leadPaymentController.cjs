const pool = require('../config/db.cjs');

exports.getLeadPayments = async (req, res) => {
  try {
    const { leadId } = req.params;
    const result = await pool.query(
      `SELECT p.*, q.quotation_number, q.grand_total as quotation_total
       FROM lead_payments p
       LEFT JOIN quotations q ON p.quotation_id = q.id
       WHERE p.lead_id = $1
       ORDER BY p.created_at DESC`,
      [leadId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

exports.createLeadPayment = async (req, res) => {
  try {
    const { leadId } = req.params;
    const {
      quotation_id,
      amount,
      payment_method,
      payment_type,
      slip_url,
      payment_date,
      status,
      verified_by,
      notes,
      created_by
    } = req.body;

    const id = `pmt_${Date.now()}`;
    const now = new Date().toISOString();

    const insertResult = await pool.query(
      `INSERT INTO lead_payments
         (id, lead_id, quotation_id, amount, payment_method, payment_type,
          slip_url, payment_date, status, verified_by, verified_at, notes, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        id, leadId, quotation_id || null, parseFloat(amount || 0),
        payment_method || 'Bank Transfer', payment_type || 'Down Payment',
        slip_url || null, payment_date || now,
        status || 'Verified & Received', verified_by || 'Admin', now,
        notes || null, now, created_by || 'System'
      ]
    );

    // Auto-update lead status to Paid (Ready to Convert)
    await pool.query(
      `UPDATE leads SET status = 'Payment Verified', updated_at = $1 WHERE id = $2`,
      [now, leadId]
    );

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};
