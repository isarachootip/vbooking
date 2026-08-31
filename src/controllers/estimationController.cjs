const pool = require('../config/db.cjs');

// ==========================================
// Draft Estimations CRUD
// ==========================================

// GET /api/estimations
exports.getEstimations = async (req, res) => {
  try {
    const query = `
      SELECT 
        e.*,
        COUNT(DISTINCT i.id) as item_count,
        COUNT(DISTINCT b.id) as bid_count,
        COALESCE(e.customer_name, l.customer_name, 'ลูกค้าทั่วไป') as customer_name,
        COALESCE(e.customer_phone, l.customer_phone, '') as customer_phone,
        COALESCE(e.customer_address, l.customer_address, '') as customer_address,
        l.customer_name as lead_customer_name,
        l.customer_phone as lead_customer_phone,
        l.customer_address as lead_customer_address,
        l.job_type as lead_job_type,
        l.branch as lead_branch,
        l.status as lead_status,
        l.project_id as lead_project_id,
        p.name as project_name,
        q.quotation_number as converted_quotation_number
      FROM draft_estimations e
      LEFT JOIN draft_estimation_items i ON e.id = i.draft_estimation_id
      LEFT JOIN contractor_bids b ON e.id = b.draft_estimation_id
      LEFT JOIN leads l ON e.lead_id = l.id
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN quotations q ON e.converted_quotation_id = q.id
      GROUP BY e.id, l.customer_name, l.customer_phone, l.customer_address, l.job_type, l.branch, l.status, l.project_id, p.name, q.quotation_number
      ORDER BY e.created_at DESC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getEstimations:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// GET /api/estimations/:id
exports.getEstimationById = async (req, res) => {
  const { id } = req.params;
  try {
    const estRes = await pool.query(`
      SELECT 
        e.*,
        COALESCE(e.customer_name, l.customer_name, 'ลูกค้าทั่วไป') as customer_name,
        COALESCE(e.customer_phone, l.customer_phone, '') as customer_phone,
        COALESCE(e.customer_address, l.customer_address, '') as customer_address,
        l.customer_name as lead_customer_name,
        l.customer_phone as lead_customer_phone,
        l.customer_address as lead_customer_address,
        l.job_type as lead_job_type,
        l.branch as lead_branch,
        l.status as lead_status,
        l.project_id as lead_project_id,
        p.name as project_name,
        q.quotation_number as converted_quotation_number
      FROM draft_estimations e
      LEFT JOIN leads l ON e.lead_id = l.id
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN quotations q ON e.converted_quotation_id = q.id
      WHERE e.id = $1
    `, [id]);

    if (estRes.rows.length === 0) {
      return res.status(404).json({ error: 'Draft Estimation not found' });
    }

    const estimation = estRes.rows[0];

    // Fetch Scope Items
    const itemsRes = await pool.query(`
      SELECT * FROM draft_estimation_items
      WHERE draft_estimation_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [id]);

    // Fetch Contractor Bids and their Bid Items
    const bidsRes = await pool.query(`
      SELECT b.*, c.phone as contractor_phone, c.skills as contractor_skills, c.rating as contractor_rating
      FROM contractor_bids b
      LEFT JOIN contractors c ON b.contractor_id = c.id
      WHERE b.draft_estimation_id = $1
      ORDER BY b.created_at ASC
    `, [id]);

    const bids = bidsRes.rows;

    for (const bid of bids) {
      const bidItemsRes = await pool.query(`
        SELECT * FROM contractor_bid_items
        WHERE bid_id = $1
      `, [bid.id]);
      bid.items = bidItemsRes.rows;
    }

    res.json({
      ...estimation,
      items: itemsRes.rows,
      bids: bids
    });
  } catch (err) {
    console.error('Error in getEstimationById:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// POST /api/estimations
exports.createEstimation = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      title,
      lead_id,
      project_id,
      customer_id,
      customer_name,
      customer_phone,
      customer_address,
      project_type,
      target_margin_percent = 30,
      vat_type = 'Exclude VAT',
      notes,
      items = [],
      created_by = 'Admin'
    } = req.body;

    const estId = `est_${Date.now()}`;
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const countRes = await client.query(`SELECT COUNT(*) FROM draft_estimations WHERE estimation_number LIKE 'EST-${dateStr}-%'`);
    const count = parseInt(countRes.rows[0].count, 10) + 1;
    const estimation_number = `EST-${dateStr}-${String(count).padStart(3, '0')}`;

    const insertEstQuery = `
      INSERT INTO draft_estimations (
        id, estimation_number, title, lead_id, project_id, customer_id,
        customer_name, customer_phone, customer_address, project_type,
        status, target_margin_percent, vat_type, notes, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Draft', $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `;

    const estResult = await client.query(insertEstQuery, [
      estId, estimation_number, title || `ประมาณการงาน ${estimation_number}`,
      lead_id || null, project_id || null, customer_id || null,
      customer_name || null, customer_phone || null, customer_address || null,
      project_type || 'Renovate', Number(target_margin_percent) || 30,
      vat_type, notes || null, created_by
    ]);

    // Insert Items
    let sortOrder = 0;
    for (const it of items) {
      const itemId = `ei_${Date.now()}_${sortOrder}`;
      const qty = Number(it.quantity) || 1;
      const matCost = Number(it.selected_material_unit_cost) || 0;
      const labCost = Number(it.selected_labor_unit_cost) || 0;
      const unitCost = matCost + labCost || Number(it.selected_unit_cost) || 0;
      const totalCost = unitCost * qty;
      const margin = Number(target_margin_percent) || 30;
      const unitPrice = Number(it.customer_unit_price) || (margin < 100 ? (unitCost / (1 - (margin / 100))) : unitCost * 1.3);
      const totalPrice = unitPrice * qty;

      await client.query(`
        INSERT INTO draft_estimation_items (
          id, draft_estimation_id, area_name, trade_category, item_name, specs_description,
          quantity, unit, price_book_id, selected_contractor_id, selected_contractor_name,
          selected_material_unit_cost, selected_labor_unit_cost, selected_unit_cost, selected_total_cost,
          customer_unit_price, customer_total_price, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `, [
        itemId, estId, it.area_name || 'พื้นที่ทั่วไป', it.trade_category || 'งานทั่วไป',
        it.item_name || 'รายการงาน', it.specs_description || null,
        qty, it.unit || 'รายการ', it.price_book_id || null,
        it.selected_contractor_id || null, it.selected_contractor_name || null,
        matCost, labCost, unitCost, totalCost, unitPrice, totalPrice, sortOrder
      ]);
      sortOrder++;
    }

    await client.query('COMMIT');
    res.status(201).json(estResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in createEstimation:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  } finally {
    client.release();
  }
};

// PUT /api/estimations/:id
exports.updateEstimation = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      title,
      customer_name,
      customer_phone,
      customer_address,
      project_type,
      status,
      target_margin_percent,
      vat_type,
      notes,
      items = []
    } = req.body;

    // Update Header
    await client.query(`
      UPDATE draft_estimations
      SET 
        title = COALESCE($1, title),
        customer_name = COALESCE($2, customer_name),
        customer_phone = COALESCE($3, customer_phone),
        customer_address = COALESCE($4, customer_address),
        project_type = COALESCE($5, project_type),
        status = COALESCE($6, status),
        target_margin_percent = COALESCE($7, target_margin_percent),
        vat_type = COALESCE($8, vat_type),
        notes = COALESCE($9, notes),
        updated_at = NOW()
      WHERE id = $10
    `, [
      title, customer_name, customer_phone, customer_address, project_type,
      status, target_margin_percent !== undefined ? Number(target_margin_percent) : null,
      vat_type, notes, id
    ]);

    // Replace items if provided
    if (items && Array.isArray(items)) {
      // Get existing item IDs to keep bid relations if possible
      const currentItemsRes = await client.query('SELECT id FROM draft_estimation_items WHERE draft_estimation_id = $1', [id]);
      const currentItemIds = currentItemsRes.rows.map(r => r.id);
      const incomingItemIds = items.filter(i => i.id).map(i => i.id);

      const itemsToDelete = currentItemIds.filter(cid => !incomingItemIds.includes(cid));
      if (itemsToDelete.length > 0) {
        await client.query('DELETE FROM draft_estimation_items WHERE id = ANY($1)', [itemsToDelete]);
      }

      let sortOrder = 0;
      for (const it of items) {
        const qty = Number(it.quantity) || 1;
        const matCost = Number(it.selected_material_unit_cost) || 0;
        const labCost = Number(it.selected_labor_unit_cost) || 0;
        const unitCost = Number(it.selected_unit_cost) || (matCost + labCost) || 0;
        const totalCost = unitCost * qty;
        const unitPrice = Number(it.customer_unit_price) || 0;
        const totalPrice = unitPrice * qty;

        if (it.id && currentItemIds.includes(it.id)) {
          // Update existing
          await client.query(`
            UPDATE draft_estimation_items
            SET 
              area_name = $1, trade_category = $2, item_name = $3, specs_description = $4,
              quantity = $5, unit = $6, price_book_id = $7, selected_contractor_id = $8,
              selected_contractor_name = $9, selected_material_unit_cost = $10,
              selected_labor_unit_cost = $11, selected_unit_cost = $12, selected_total_cost = $13,
              customer_unit_price = $14, customer_total_price = $15, sort_order = $16
            WHERE id = $17
          `, [
            it.area_name || 'พื้นที่ทั่วไป', it.trade_category || 'งานทั่วไป',
            it.item_name, it.specs_description || null,
            qty, it.unit || 'รายการ', it.price_book_id || null,
            it.selected_contractor_id || null, it.selected_contractor_name || null,
            matCost, labCost, unitCost, totalCost, unitPrice, totalPrice, sortOrder,
            it.id
          ]);
        } else {
          // Insert new
          const itemId = it.id || `ei_${Date.now()}_${sortOrder}`;
          await client.query(`
            INSERT INTO draft_estimation_items (
              id, draft_estimation_id, area_name, trade_category, item_name, specs_description,
              quantity, unit, price_book_id, selected_contractor_id, selected_contractor_name,
              selected_material_unit_cost, selected_labor_unit_cost, selected_unit_cost, selected_total_cost,
              customer_unit_price, customer_total_price, sort_order
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `, [
            itemId, id, it.area_name || 'พื้นที่ทั่วไป', it.trade_category || 'งานทั่วไป',
            it.item_name || 'รายการงาน', it.specs_description || null,
            qty, it.unit || 'รายการ', it.price_book_id || null,
            it.selected_contractor_id || null, it.selected_contractor_name || null,
            matCost, labCost, unitCost, totalCost, unitPrice, totalPrice, sortOrder
          ]);
        }
        sortOrder++;
      }
    }

    // Recalculate totals
    const sumRes = await client.query(`
      SELECT 
        SUM(selected_total_cost) as total_cost,
        SUM(customer_total_price) as subtotal
      FROM draft_estimation_items
      WHERE draft_estimation_id = $1
    `, [id]);

    const totalCost = Number(sumRes.rows[0].total_cost || 0);
    const subtotal = Number(sumRes.rows[0].subtotal || 0);

    const estMeta = await client.query('SELECT vat_type FROM draft_estimations WHERE id = $1', [id]);
    const currentVatType = estMeta.rows[0]?.vat_type || 'Exclude VAT';
    let vatAmount = 0;
    let grandTotal = subtotal;

    if (currentVatType === 'Exclude VAT') {
      vatAmount = subtotal * 0.07;
      grandTotal = subtotal + vatAmount;
    } else if (currentVatType === 'Include VAT') {
      vatAmount = subtotal - (subtotal / 1.07);
    }

    await client.query(`
      UPDATE draft_estimations
      SET 
        selected_total_cost = $1,
        proposed_subtotal = $2,
        proposed_vat_amount = $3,
        proposed_grand_total = $4,
        updated_at = NOW()
      WHERE id = $5
    `, [totalCost, subtotal, vatAmount, grandTotal, id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Draft Estimation updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in updateEstimation:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  } finally {
    client.release();
  }
};

// DELETE /api/estimations/:id
exports.deleteEstimation = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM draft_estimations WHERE id = $1', [id]);
    res.json({ success: true, message: 'Draft Estimation deleted' });
  } catch (err) {
    console.error('Error in deleteEstimation:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// ==========================================
// Contractor Bids Management
// ==========================================

// POST /api/estimations/:id/bids
exports.saveContractorBid = async (req, res) => {
  const { id: draft_estimation_id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      bid_id,
      contractor_id,
      contractor_name,
      bid_date = new Date().toISOString().split('T')[0],
      estimated_days = 0,
      notes,
      items = []
    } = req.body;

    let finalBidId = bid_id;
    if (!finalBidId) {
      finalBidId = `bid_${Date.now()}`;
      await client.query(`
        INSERT INTO contractor_bids (
          id, draft_estimation_id, contractor_id, contractor_name, bid_date, estimated_days, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        finalBidId, draft_estimation_id, contractor_id || null, contractor_name || 'ช่างนิรนาม',
        bid_date, Number(estimated_days) || 0, notes || null
      ]);
    } else {
      await client.query(`
        UPDATE contractor_bids
        SET contractor_id = $1, contractor_name = $2, bid_date = $3, estimated_days = $4, notes = $5, updated_at = NOW()
        WHERE id = $6
      `, [
        contractor_id || null, contractor_name || 'ช่างนิรนาม',
        bid_date, Number(estimated_days) || 0, notes || null, finalBidId
      ]);
      // Remove old bid items
      await client.query('DELETE FROM contractor_bid_items WHERE bid_id = $1', [finalBidId]);
    }

    let totalBidAmount = 0;

    for (const it of items) {
      const bidItemId = `cbi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const matPrice = Number(it.material_unit_price) || 0;
      const labPrice = Number(it.labor_unit_price) || 0;
      const totalUnitPrice = matPrice + labPrice || Number(it.total_unit_price) || 0;
      const qty = Number(it.quantity) || 1;
      const totalAmount = totalUnitPrice * qty;

      totalBidAmount += totalAmount;

      await client.query(`
        INSERT INTO contractor_bid_items (
          id, bid_id, draft_item_id, material_unit_price, labor_unit_price, total_unit_price, total_amount, remark, is_selected
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        bidItemId, finalBidId, it.draft_item_id, matPrice, labPrice, totalUnitPrice, totalAmount, it.remark || null, Boolean(it.is_selected)
      ]);
    }

    // Update total bid amount
    await client.query('UPDATE contractor_bids SET total_bid_amount = $1 WHERE id = $2', [totalBidAmount, finalBidId]);

    // Update status of draft estimation to 'Comparing' if currently 'Draft'
    await client.query(`
      UPDATE draft_estimations 
      SET status = 'Comparing', updated_at = NOW() 
      WHERE id = $1 AND status = 'Draft'
    `, [draft_estimation_id]);

    await client.query('COMMIT');
    res.status(200).json({ success: true, bid_id: finalBidId, total_bid_amount: totalBidAmount });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in saveContractorBid:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  } finally {
    client.release();
  }
};

// DELETE /api/estimations/:id/bids/:bidId
exports.deleteContractorBid = async (req, res) => {
  const { bidId } = req.params;
  try {
    await pool.query('DELETE FROM contractor_bids WHERE id = $1', [bidId]);
    res.json({ success: true, message: 'Contractor Bid removed' });
  } catch (err) {
    console.error('Error in deleteContractorBid:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// POST /api/estimations/:id/apply-selection
// Applies selected contractor prices per item and calculates final prices with margin %
exports.applyContractorSelection = async (req, res) => {
  const { id: draft_estimation_id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { selections = [], target_margin_percent } = req.body;
    // selections: [{ draft_item_id, contractor_id, contractor_name, material_unit_cost, labor_unit_cost, unit_cost, customer_unit_price }]

    let finalMargin = target_margin_percent;
    if (finalMargin === undefined) {
      const estRes = await client.query('SELECT target_margin_percent FROM draft_estimations WHERE id = $1', [draft_estimation_id]);
      finalMargin = Number(estRes.rows[0]?.target_margin_percent || 30);
    } else {
      await client.query('UPDATE draft_estimations SET target_margin_percent = $1 WHERE id = $2', [Number(finalMargin), draft_estimation_id]);
    }

    for (const sel of selections) {
      const qtyRes = await client.query('SELECT quantity FROM draft_estimation_items WHERE id = $1', [sel.draft_item_id]);
      const qty = Number(qtyRes.rows[0]?.quantity || 1);

      const matCost = Number(sel.material_unit_cost) || 0;
      const labCost = Number(sel.labor_unit_cost) || 0;
      const unitCost = Number(sel.unit_cost) || (matCost + labCost);
      const totalCost = unitCost * qty;

      let custUnitPrice = Number(sel.customer_unit_price);
      if (!custUnitPrice || isNaN(custUnitPrice)) {
        custUnitPrice = finalMargin < 100 ? (unitCost / (1 - (finalMargin / 100))) : (unitCost * 1.3);
      }
      // Round to 2 decimals
      custUnitPrice = Math.round(custUnitPrice * 100) / 100;
      const custTotalPrice = Math.round(custUnitPrice * qty * 100) / 100;

      await client.query(`
        UPDATE draft_estimation_items
        SET 
          selected_contractor_id = $1,
          selected_contractor_name = $2,
          selected_material_unit_cost = $3,
          selected_labor_unit_cost = $4,
          selected_unit_cost = $5,
          selected_total_cost = $6,
          customer_unit_price = $7,
          customer_total_price = $8
        WHERE id = $9
      `, [
        sel.contractor_id || null, sel.contractor_name || null,
        matCost, labCost, unitCost, totalCost,
        custUnitPrice, custTotalPrice, sel.draft_item_id
      ]);
    }

    // Recalculate totals
    const sumRes = await client.query(`
      SELECT 
        SUM(selected_total_cost) as total_cost,
        SUM(customer_total_price) as subtotal
      FROM draft_estimation_items
      WHERE draft_estimation_id = $1
    `, [draft_estimation_id]);

    const totalCost = Number(sumRes.rows[0].total_cost || 0);
    const subtotal = Number(sumRes.rows[0].subtotal || 0);

    const estMeta = await client.query('SELECT vat_type FROM draft_estimations WHERE id = $1', [draft_estimation_id]);
    const currentVatType = estMeta.rows[0]?.vat_type || 'Exclude VAT';
    let vatAmount = 0;
    let grandTotal = subtotal;

    if (currentVatType === 'Exclude VAT') {
      vatAmount = subtotal * 0.07;
      grandTotal = subtotal + vatAmount;
    } else if (currentVatType === 'Include VAT') {
      vatAmount = subtotal - (subtotal / 1.07);
    }

    await client.query(`
      UPDATE draft_estimations
      SET 
        selected_total_cost = $1,
        proposed_subtotal = $2,
        proposed_vat_amount = $3,
        proposed_grand_total = $4,
        status = 'Finalized',
        updated_at = NOW()
      WHERE id = $5
    `, [totalCost, subtotal, vatAmount, grandTotal, draft_estimation_id]);

    await client.query('COMMIT');
    res.json({
      success: true,
      selected_total_cost: totalCost,
      proposed_subtotal: subtotal,
      proposed_grand_total: grandTotal
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in applyContractorSelection:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  } finally {
    client.release();
  }
};

// ==========================================
// 1-Click Convert Draft to Quotation
// ==========================================

// POST /api/estimations/:id/convert-to-quotation
exports.convertToQuotation = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const estRes = await client.query(`SELECT * FROM draft_estimations WHERE id = $1`, [id]);
    if (estRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Draft estimation not found' });
    }
    const est = estRes.rows[0];

    const itemsRes = await client.query(`
      SELECT * FROM draft_estimation_items
      WHERE draft_estimation_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [id]);
    const draftItems = itemsRes.rows;

    if (draftItems.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Draft estimation has no scope items' });
    }

    // Generate Quotation Number
    const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
    const countResult = await client.query(`SELECT COUNT(*) FROM quotations WHERE quotation_number LIKE 'QUO-${dateStr}-%'`);
    const count = parseInt(countResult.rows[0].count, 10) + 1;
    const quotation_number = `QUO-${dateStr}-${count.toString().padStart(3, '0')}`;

    const quoId = `quo_${Date.now()}`;
    const now = new Date().toISOString();

    let subtotal = 0;
    let total_cost = 0;

    for (const it of draftItems) {
      subtotal += Number(it.customer_total_price || 0);
      total_cost += Number(it.selected_total_cost || 0);
    }

    let vat_amount = 0;
    let grand_total = subtotal;
    const vat_type = est.vat_type || 'Exclude VAT';

    if (vat_type === 'Exclude VAT') {
      vat_amount = subtotal * 0.07;
      grand_total = subtotal + vat_amount;
    } else if (vat_type === 'Include VAT') {
      vat_amount = subtotal - (subtotal / 1.07);
    }

    // Insert into quotations table
    await client.query(`
      INSERT INTO quotations (
        id, lead_id, project_id, customer_id, quotation_number, issue_date, valid_until, status,
        subtotal, vat_type, vat_amount, grand_total, total_cost, notes,
        customer_name, customer_phone, customer_address,
        created_at, created_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      quoId,
      est.lead_id || null,
      est.project_id || null,
      est.customer_id || null,
      quotation_number,
      now.split('T')[0],
      null,
      'Draft',
      subtotal,
      vat_type,
      vat_amount,
      grand_total,
      total_cost,
      est.notes || `สร้างอัตโนมัติจาก Draft ประมาณการ: ${est.estimation_number} (${est.title})`,
      est.customer_name || null,
      est.customer_phone || null,
      est.customer_address || null,
      now,
      req.body.created_by || est.created_by || 'Admin',
      now
    ]);

    // Insert quotation items
    for (let i = 0; i < draftItems.length; i++) {
      const it = draftItems[i];
      const qiId = `qi_${Date.now()}_${i}`;
      const serviceDisplayName = `[${it.area_name} - ${it.trade_category}] ${it.item_name}`;

      await client.query(`
        INSERT INTO quotation_items (
          id, quotation_id, price_book_id, service_name, quantity, unit_type, unit_cost, unit_price, total_price, sort_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        qiId,
        quoId,
        it.price_book_id || null,
        serviceDisplayName,
        Number(it.quantity) || 1,
        it.unit || 'รายการ',
        Number(it.selected_unit_cost) || 0,
        Number(it.customer_unit_price) || 0,
        Number(it.customer_total_price) || 0,
        i
      ]);
    }

    // Update Draft status to Converted
    await client.query(`
      UPDATE draft_estimations
      SET 
        status = 'Converted',
        converted_quotation_id = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [quoId, id]);

    // Update Lead status if linked
    if (est.lead_id) {
      await client.query(`
        UPDATE leads
        SET status = 'Pending Quote', updated_at = $1
        WHERE id = $2
      `, [now, est.lead_id]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      quotation_id: quoId,
      quotation_number: quotation_number,
      grand_total: grand_total,
      message: `แปลงเป็นใบเสนอราคา ${quotation_number} สำเร็จแล้ว`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in convertToQuotation:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  } finally {
    client.release();
  }
};

// ==========================================
// Contractors Master CRUD
// ==========================================

// GET /api/contractors
exports.getContractors = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM contractors
      ORDER BY rating DESC, name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error in getContractors:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// POST /api/contractors
exports.createContractor = async (req, res) => {
  try {
    const {
      name,
      contact_person,
      phone,
      line_id,
      skills = [],
      rating = 5.0,
      bank_name,
      bank_account_no,
      bank_account_name,
      notes
    } = req.body;

    const id = `cont_${Date.now()}`;
    const result = await pool.query(`
      INSERT INTO contractors (
        id, name, contact_person, phone, line_id, skills, rating,
        bank_name, bank_account_no, bank_account_name, notes, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Active', NOW(), NOW())
      RETURNING *
    `, [
      id, name, contact_person || null, phone || null, line_id || null,
      skills || [], Number(rating) || 5.0, bank_name || null,
      bank_account_no || null, bank_account_name || null, notes || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error in createContractor:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// PUT /api/contractors/:id
exports.updateContractor = async (req, res) => {
  const { id } = req.params;
  try {
    const {
      name,
      contact_person,
      phone,
      line_id,
      skills,
      rating,
      status,
      bank_name,
      bank_account_no,
      bank_account_name,
      notes
    } = req.body;

    const result = await pool.query(`
      UPDATE contractors
      SET 
        name = COALESCE($1, name),
        contact_person = COALESCE($2, contact_person),
        phone = COALESCE($3, phone),
        line_id = COALESCE($4, line_id),
        skills = COALESCE($5, skills),
        rating = COALESCE($6, rating),
        status = COALESCE($7, status),
        bank_name = COALESCE($8, bank_name),
        bank_account_no = COALESCE($9, bank_account_no),
        bank_account_name = COALESCE($10, bank_account_name),
        notes = COALESCE($11, notes),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [
      name, contact_person, phone, line_id, skills,
      rating !== undefined ? Number(rating) : null, status,
      bank_name, bank_account_no, bank_account_name, notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in updateContractor:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};

// DELETE /api/contractors/:id
exports.deleteContractor = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM contractors WHERE id = $1', [id]);
    res.json({ success: true, message: 'Contractor deleted' });
  } catch (err) {
    console.error('Error in deleteContractor:', err);
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
};
