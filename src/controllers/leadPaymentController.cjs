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
      ticket_no,
      reference_no,
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
          ticket_no, reference_no, slip_url, payment_date, status, verified_by, verified_at, notes, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id, leadId, quotation_id || null, parseFloat(amount || 0),
        payment_method || 'Bank Transfer', payment_type || 'Down Payment',
        ticket_no || reference_no || null, reference_no || ticket_no || null,
        slip_url || null, payment_date || now,
        status || 'Verified & Received', verified_by || 'Admin', now,
        notes || null, now, created_by || 'System'
      ]
    );

    // Auto-update lead status to Close Won only when slip_url is attached
    const hasSlip = Boolean(slip_url && slip_url.trim().length > 0);
    const newStatus = hasSlip ? 'Close Won' : 'Pending Slip Verification';

    await pool.query(
      `UPDATE leads SET status = $1, updated_at = $2 WHERE id = $3`,
      [newStatus, now, leadId]
    );

    // Write audit log
    const flwId = `flw_pmt_${Date.now()}`;
    const actType = hasSlip ? 'ปิดการขายสำเร็จ (Close Won)' : 'บันทึกการชำระเงิน (รอสลิป)';
    const actNote = hasSlip 
      ? `ลูกค้าชำระเงินมัดจำและแนบหลักฐานสลิปโอนเงิน (Slip) เรียบร้อยแล้ว ยอดเงิน: ${parseFloat(amount || 0).toLocaleString()} บาท [สถานะ: Close Won]`
      : `บันทึกรายการเงินมัดจำ ${parseFloat(amount || 0).toLocaleString()} บาท (ยังไม่ได้แนบรูปสลิป)`;

    await pool.query(
      `INSERT INTO lead_followups (id, lead_id, activity_type, notes, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [flwId, leadId, actType, actNote, now, created_by || 'System']
    );

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error creating payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

exports.getQuotationPayments = async (req, res) => {
  try {
    const { id } = req.params;
    // Get quotation to see if it has a lead_id
    const quoRes = await pool.query('SELECT lead_id FROM quotations WHERE id = $1', [id]);
    const leadId = quoRes.rows[0]?.lead_id;

    const result = await pool.query(
      `SELECT p.*, q.quotation_number, q.grand_total as quotation_total
       FROM lead_payments p
       LEFT JOIN quotations q ON p.quotation_id = q.id
       WHERE p.quotation_id = $1 OR ($2::text IS NOT NULL AND p.lead_id = $2)
       ORDER BY p.created_at DESC`,
      [id, leadId || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quotation payments:', err);
    res.status(500).json({ error: 'Failed to fetch quotation payments' });
  }
};

exports.createQuotationPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount,
      payment_method,
      payment_type,
      ticket_no,
      reference_no,
      slip_url,
      payment_date,
      status,
      verified_by,
      notes,
      created_by
    } = req.body;

    // Get quotation details
    const quoRes = await pool.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    const quo = quoRes.rows[0];
    const leadId = quo.lead_id || null;

    const pmtId = `pmt_${Date.now()}`;
    const now = new Date().toISOString();

    const insertResult = await pool.query(
      `INSERT INTO lead_payments
         (id, lead_id, quotation_id, amount, payment_method, payment_type,
          ticket_no, reference_no, slip_url, payment_date, status, verified_by, verified_at, notes, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        pmtId, leadId, id, parseFloat(amount || 0),
        payment_method || 'Bank Transfer', payment_type || 'Down Payment',
        ticket_no || reference_no || null, reference_no || ticket_no || null,
        slip_url || null, payment_date || now,
        status || 'Verified & Received', verified_by || 'Admin', now,
        notes || null, now, created_by || 'System'
      ]
    );

    // If quotation has lead_id, update lead status to Close Won when slip is attached
    if (leadId) {
      const hasSlip = Boolean(slip_url && slip_url.trim().length > 0);
      const newStatus = hasSlip ? 'Close Won' : 'Pending Slip Verification';

      await pool.query(
        `UPDATE leads SET status = $1, updated_at = $2 WHERE id = $3`,
        [newStatus, now, leadId]
      );

      const flwId = `flw_pmt_${Date.now()}`;
      const actType = hasSlip ? 'ปิดการขายสำเร็จ (Close Won)' : 'บันทึกการชำระเงิน (รอสลิป)';
      const actNote = hasSlip 
        ? `ลูกค้าชำระเงินมัดจำและแนบหลักฐานสลิปโอนเงิน (Slip) ใบเสนอราคา #${quo.quotation_number || id} ยอดเงิน: ${parseFloat(amount || 0).toLocaleString()} บาท [สถานะ: Close Won]`
        : `บันทึกรายการเงินมัดจำ ${parseFloat(amount || 0).toLocaleString()} บาท (ยังไม่ได้แนบรูปสลิป)`;

      await pool.query(
        `INSERT INTO lead_followups (id, lead_id, activity_type, notes, created_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [flwId, leadId, actType, actNote, now, created_by || 'System']
      );
    }

    res.json(insertResult.rows[0]);
  } catch (err) {
    console.error('Error creating quotation payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};
