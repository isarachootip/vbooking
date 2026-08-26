const pool = require('../config/db.cjs');

exports.createQuotation = async (req, res) => {
  try {
    const { 
      lead_id, 
      project_id, 
      customer_id,
      issue_date, 
      valid_until, 
      vat_type, 
      items, 
      notes, 
      customer_name, 
      customer_phone, 
      customer_address, 
      created_by 
    } = req.body;
    
    // Generate a quotation number (e.g., QUO-YYYYMM-001)
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const countResult = await pool.query(`SELECT COUNT(*) FROM quotations WHERE quotation_number LIKE 'QUO-${dateStr}-%'`);
    const count = parseInt(countResult.rows[0].count) + 1;
    const quotation_number = `QUO-${dateStr}-${count.toString().padStart(3, '0')}`;
    
    const quoId = `quo_${Date.now()}`;
    const now = new Date().toISOString();
    
    // Calculate totals
    let subtotal = 0;
    let total_cost = 0;
    
    if (items && Array.isArray(items)) {
      for (const item of items) {
        subtotal += Number(item.total_price || 0);
        total_cost += (Number(item.unit_cost || 0) * Number(item.quantity || 1));
      }
    }
    
    let vat_amount = 0;
    let grand_total = subtotal;
    
    if (vat_type === 'Exclude VAT') {
      vat_amount = subtotal * 0.07;
      grand_total = subtotal + vat_amount;
    } else if (vat_type === 'Include VAT') {
      // subtotal already includes VAT
      vat_amount = subtotal - (subtotal / 1.07);
    }
    
    // Insert quotation header
    const quoResult = await pool.query(
      `INSERT INTO quotations (
        id, lead_id, project_id, customer_id, quotation_number, issue_date, valid_until, status, 
        subtotal, vat_type, vat_amount, grand_total, total_cost, notes, 
        customer_name, customer_phone, customer_address, 
        created_at, created_by, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
      [
        quoId, 
        lead_id || null, 
        project_id || null, 
        customer_id || null,
        quotation_number, 
        issue_date || now.split('T')[0], 
        valid_until || null, 
        'Draft', 
        subtotal, 
        vat_type || 'Exclude VAT', 
        vat_amount, 
        grand_total, 
        total_cost, 
        notes || null, 
        customer_name || null, 
        customer_phone || null, 
        customer_address || null, 
        now, 
        created_by || 'Admin', 
        now
      ]
    );
    
    // Insert quotation items
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = `qi_${Date.now()}_${i}`;
        await pool.query(
          `INSERT INTO quotation_items (id, quotation_id, price_book_id, service_name, quantity, unit_type, unit_cost, unit_price, total_price, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [itemId, quoId, item.price_book_id || null, item.service_name, item.quantity || 1, item.unit_type || 'งาน', item.unit_cost || 0, item.unit_price || 0, item.total_price || 0, i]
        );
      }
    }
    
    // Auto-update lead status if linked to a lead
    if (lead_id) {
      await pool.query(
        `UPDATE leads SET status = 'Pending Quote', updated_at = $1 WHERE id = $2`,
        [now, lead_id]
      );
    }
    
    res.status(201).json(quoResult.rows[0]);
  } catch (err) {
    console.error('Error creating quotation:', err);
    res.status(500).json({ error: 'Failed to create quotation' });
  }
};

exports.getQuotations = async (req, res) => {
  try {
    const { lead_id, project_id, customer_id, status } = req.query;
    let query = `
      SELECT q.*, 
             COALESCE(q.customer_name, c.customer_name, l.customer_name, p.customer_name, 'ลูกค้าทั่วไป') AS customer_name,
             COALESCE(q.customer_phone, c.phone, l.customer_phone, p.customer_phone, '') AS customer_phone,
             COALESCE(q.customer_address, l.customer_address, '') AS customer_address,
             c.customer_code,
             l.job_type AS lead_job_type,
             p.name AS project_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN leads l ON q.lead_id = l.id
      LEFT JOIN projects p ON q.project_id = p.id
    `;
    const conditions = [];
    const params = [];
    
    if (lead_id) {
      params.push(lead_id);
      conditions.push(`q.lead_id = $${params.length}`);
    }
    if (project_id) {
      params.push(project_id);
      conditions.push(`q.project_id = $${params.length}`);
    }
    if (customer_id) {
      params.push(customer_id);
      conditions.push(`q.customer_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`q.status = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY q.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ error: 'Failed to fetch quotations' });
  }
};

exports.getQuotationById = async (req, res) => {
  try {
    const { id } = req.params;
    const quoResult = await pool.query(`
      SELECT q.*, 
             COALESCE(q.customer_name, c.customer_name, l.customer_name, p.customer_name, 'ลูกค้าทั่วไป') AS customer_name,
             COALESCE(q.customer_phone, c.phone, l.customer_phone, p.customer_phone, '') AS customer_phone,
             COALESCE(q.customer_address, l.customer_address, '') AS customer_address,
             c.customer_code,
             l.job_type AS lead_job_type,
             p.name AS project_name
      FROM quotations q
      LEFT JOIN customers c ON q.customer_id = c.id
      LEFT JOIN leads l ON q.lead_id = l.id
      LEFT JOIN projects p ON q.project_id = p.id
      WHERE q.id = $1
    `, [id]);
    
    if (quoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }
    
    const itemsResult = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY sort_order ASC', [id]);
    
    res.json({
      ...quoResult.rows[0],
      items: itemsResult.rows
    });
  } catch (err) {
    console.error('Error fetching quotation:', err);
    res.status(500).json({ error: 'Failed to fetch quotation' });
  }
};

exports.updateQuotationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, valid_until } = req.body;
    const now = new Date().toISOString();

    const updates = ['updated_at = $1'];
    const params = [now, id];

    if (status) {
      params.push(status);
      updates.push(`status = $${params.length}`);
    }
    if (notes !== undefined) {
      params.push(notes);
      updates.push(`notes = $${params.length}`);
    }
    if (valid_until !== undefined) {
      params.push(valid_until);
      updates.push(`valid_until = $${params.length}`);
    }

    const result = await pool.query(
      `UPDATE quotations SET ${updates.join(', ')} WHERE id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating quotation status:', err);
    res.status(500).json({ error: 'Failed to update quotation status' });
  }
};

exports.deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM quotations WHERE id = $1', [id]);
    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ error: 'Failed to delete quotation' });
  }
};

exports.convertToProject = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get Quotation & Items
    const quoResult = await pool.query('SELECT * FROM quotations WHERE id = $1', [id]);
    if (quoResult.rows.length === 0) return res.status(404).json({ error: 'Quotation not found' });
    const quotation = quoResult.rows[0];
    
    if (quotation.status === 'Converted' || quotation.project_id) {
      return res.status(400).json({ error: 'Quotation is already converted' });
    }
    
    const itemsResult = await pool.query('SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY sort_order ASC', [id]);
    const items = itemsResult.rows;

    // 2. Get Lead for context (job type, name, phone, branch)
    let jobType = 'Renovation';
    let customerName = quotation.customer_name || 'Customer';
    let customerPhone = quotation.customer_phone || '';
    let customerAddress = quotation.customer_address || '';
    let branch = 'HQ0';
    let leadId = null;
    if (quotation.lead_id) {
      leadId = quotation.lead_id;
      const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [quotation.lead_id]);
      if (leadResult.rows.length > 0) {
        const lead = leadResult.rows[0];
        jobType = lead.job_type || 'Renovation';
        customerName = lead.customer_name || customerName;
        customerPhone = lead.customer_phone || customerPhone;
        customerAddress = lead.customer_address || customerAddress;
        branch = lead.branch || 'HQ0';
      }
    }

    // 3. Generate Smart Project ID (Logic: P + JobPrefix + Branch + DDMMYYYY + 0001)
    let jobPrefix = 'O';
    const jt = jobType.toLowerCase();
    if (jt.includes('quick')) jobPrefix = 'Q';
    else if (jt.includes('install')) jobPrefix = 'I';
    else if (jt.includes('renovat')) jobPrefix = 'R';
    else if (jt.includes('build')) jobPrefix = 'B';
    else if (jt.includes('new')) jobPrefix = 'N';
    else if (jt.includes('ma service')) jobPrefix = 'M';

    const branchPrefix = branch.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'HQ0';
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const dateStr = `${dd}${mm}${yyyy}`;
    const prefix = `P${jobPrefix}${branchPrefix}${dateStr}`;

    const pRes = await pool.query("SELECT id FROM projects WHERE id LIKE $1 ORDER BY id DESC LIMIT 1", [`${prefix}%`]);
    let running = 1;
    if (pRes.rows.length > 0) {
      const lastId = pRes.rows[0].id;
      const numPart = lastId.replace(prefix, '');
      const lastNum = parseInt(numPart, 10);
      if (!isNaN(lastNum)) running = lastNum + 1;
    }
    const projectId = `${prefix}${String(running).padStart(4, '0')}`;

    // 4. Create Project
    const now = new Date().toISOString();
    const end = new Date();
    end.setDate(end.getDate() + 30); // Default 1 month
    
    await pool.query(
      `INSERT INTO projects (id, name, description, status, start_date, end_date, budget, project_type, lead_id, customer_name, customer_phone, converted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [projectId, `[${jobType}] ${customerName}`, `Auto-generated from Quotation ${quotation.quotation_number}`, 'Planning', now, end.toISOString(), quotation.grand_total, jobType, leadId, customerName, customerPhone, now]
    );

    // 5. Create Tasks from Quotation Items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const taskId = `t_${Date.now()}_${i}`;
      await pool.query(
        `INSERT INTO tasks (id, project_id, title, status, priority, estimated_hours, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [taskId, projectId, `${item.service_name} (x${item.quantity} ${item.unit_type})`, 'To Do', 'Medium', 8, now]
      );
    }

    // 6. Update Quotation status
    await pool.query("UPDATE quotations SET status = 'Converted', project_id = $1, updated_at = $2 WHERE id = $3", [projectId, now, id]);

    res.json({ success: true, project_id: projectId });
  } catch (err) {
    console.error('Error converting quotation to project:', err);
    res.status(500).json({ error: 'Failed to convert quotation' });
  }
};
