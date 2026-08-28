const pool = require('../config/db.cjs');

function formatCustomer(c) {
  if (!c) return null;
  return {
    ...c,
    customerId: c.id,
    customerCode: c.customer_code,
    customerType: c.customer_type,
    firstName: c.first_name,
    lastName: c.last_name,
    customerName: c.customer_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
    companyName: c.company_name,
    taxId: c.tax_id,
    phone: c.phone,
    phoneSecondary: c.phone_secondary,
    lineId: c.line_id,
    email: c.email,
    notes: c.notes,
    sitesCount: c.sites_count ? Number(c.sites_count) : 0,
    leadsCount: c.leads_count ? Number(c.leads_count) : 0,
    defaultSiteId: c.default_site_id,
    defaultSiteName: c.default_site_name,
    defaultSiteAddress: c.default_site_address,
    defaultSiteLat: c.default_site_lat,
    defaultSiteLng: c.default_site_lng,
    createdAt: c.created_at,
    updatedAt: c.updated_at
  };
}

function formatCustomerSite(s) {
  if (!s) return null;
  return {
    ...s,
    customerId: s.customer_id,
    siteName: s.site_name,
    isDefault: Boolean(s.is_default),
    postalCode: s.postal_code,
    mapUrl: s.map_url,
    coordinatorName: s.coordinator_name,
    coordinatorPhone: s.coordinator_phone,
    coordinatorLineId: s.coordinator_line_id,
    siteNotes: s.site_notes,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

// GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { search, type } = req.query;
    let query = `
      SELECT c.*, 
        COALESCE(s_count.cnt, 0)::int as sites_count,
        COALESCE(l_count.cnt, 0)::int as leads_count,
        def_site.id as default_site_id,
        def_site.site_name as default_site_name,
        def_site.address as default_site_address,
        def_site.latitude as default_site_lat,
        def_site.longitude as default_site_lng
      FROM customers c
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as cnt FROM customer_sites GROUP BY customer_id
      ) s_count ON s_count.customer_id = c.id
      LEFT JOIN (
        SELECT customer_id, COUNT(*) as cnt FROM leads WHERE customer_id IS NOT NULL GROUP BY customer_id
      ) l_count ON l_count.customer_id = c.id
      LEFT JOIN (
        SELECT DISTINCT ON (customer_id) * FROM customer_sites ORDER BY customer_id, is_default DESC, created_at ASC
      ) def_site ON def_site.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const idx = params.length;
      query += ` AND (
        LOWER(c.first_name) LIKE $${idx} OR 
        LOWER(c.last_name) LIKE $${idx} OR 
        LOWER(c.customer_name) LIKE $${idx} OR 
        LOWER(COALESCE(c.company_name, '')) LIKE $${idx} OR 
        c.phone LIKE $${idx} OR 
        COALESCE(c.tax_id, '') LIKE $${idx} OR
        COALESCE(c.customer_code, '') LIKE $${idx}
      )`;
    }

    if (type && type !== 'all') {
      params.push(type);
      query += ` AND c.customer_type = $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows.map(formatCustomer));
  } catch (err) {
    console.error('Error getting customers:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

// GET /api/customers/:id
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customerRes = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    const customer = formatCustomer(customerRes.rows[0]);

    const sitesRes = await pool.query(
      'SELECT * FROM customer_sites WHERE customer_id = $1 ORDER BY is_default DESC, created_at ASC',
      [id]
    );
    customer.sites = sitesRes.rows.map(formatCustomerSite);

    // Recent leads
    const leadsRes = await pool.query(
      'SELECT id, job_type, status, created_at, customer_address FROM leads WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10',
      [id]
    );
    customer.recent_leads = leadsRes.rows;

    res.json(customer);
  } catch (err) {
    console.error('Error getting customer by id:', err);
    res.status(500).json({ error: 'Failed to fetch customer details' });
  }
};

// POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const {
      customer_type = 'individual',
      first_name,
      last_name,
      customer_name,
      company_name,
      tax_id,
      phone,
      phone_secondary,
      line_id,
      email,
      notes,
      // Optional initial site info
      site_name,
      address,
      subdistrict,
      district,
      province,
      postal_code,
      latitude,
      longitude,
      map_url,
      coordinator_name,
      coordinator_phone,
      coordinator_line_id,
      site_notes
    } = req.body;

    const fName = (first_name || (customer_name ? customer_name.split(' ')[0] : '') || 'ไม่ระบุชื่อ').trim();
    const lName = (last_name || (customer_name ? customer_name.split(' ').slice(1).join(' ') : '') || '').trim();
    const fullName = customer_name ? customer_name.trim() : `${fName} ${lName}`.trim();

    // Generate Customer Code (Standard: CUST-YYYYMMDD-0001)
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;
    const codePrefix = `CUST-${dateStr}-`;

    const countRes = await pool.query(
      `SELECT customer_code FROM customers WHERE customer_code LIKE $1`,
      [`${codePrefix}%`]
    );
    let maxNum = 0;
    for (const row of countRes.rows) {
      if (row.customer_code) {
        const numPart = parseInt(row.customer_code.replace(codePrefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    }
    const customerCode = `${codePrefix}${String(maxNum + 1).padStart(4, '0')}`;
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const insertCustomerRes = await pool.query(
      `INSERT INTO customers (
        id, customer_code, customer_type, first_name, last_name, customer_name,
        company_name, tax_id, phone, phone_secondary, line_id, email, notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *`,
      [
        customerId, customerCode, customer_type, fName, lName, fullName,
        company_name || null, tax_id || null, phone || null, phone_secondary || null,
        line_id || null, email || null, notes || null
      ]
    );
    const createdCustomer = insertCustomerRes.rows[0];

    // Create default site if address is provided
    let createdSite = null;
    if (address || site_name || (latitude && longitude)) {
      const siteId = `site_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const sName = (site_name || 'สถานที่หลัก (Site 1)').trim();
      const sAddress = (address || 'ไม่ระบุที่อยู่').trim();

      const insertSiteRes = await pool.query(
        `INSERT INTO customer_sites (
          id, customer_id, site_name, is_default, address, subdistrict, district,
          province, postal_code, latitude, longitude, map_url,
          coordinator_name, coordinator_phone, coordinator_line_id, site_notes,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING *`,
        [
          siteId, customerId, sName, true, sAddress, subdistrict || null, district || null,
          province || null, postal_code || null, latitude || null, longitude || null,
          map_url || null, coordinator_name || fName, coordinator_phone || phone || null,
          coordinator_line_id || line_id || null, site_notes || null
        ]
      );
      createdSite = insertSiteRes.rows[0];
    }

    createdCustomer.sites = createdSite ? [createdSite] : [];
    res.status(201).json(createdCustomer);
  } catch (err) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

// PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_type,
      first_name,
      last_name,
      customer_name,
      company_name,
      tax_id,
      phone,
      phone_secondary,
      line_id,
      email,
      notes
    } = req.body;

    const fName = first_name ? first_name.trim() : '';
    const lName = last_name ? last_name.trim() : '';
    const fullName = customer_name ? customer_name.trim() : `${fName} ${lName}`.trim();

    const result = await pool.query(
      `UPDATE customers SET
        customer_type = COALESCE($1, customer_type),
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        customer_name = COALESCE($4, customer_name),
        company_name = $5,
        tax_id = $6,
        phone = COALESCE($7, phone),
        phone_secondary = $8,
        line_id = $9,
        email = $10,
        notes = $11,
        updated_at = NOW()
      WHERE id = $12
      RETURNING *`,
      [
        customer_type, fName || null, lName || null, fullName || null,
        company_name || null, tax_id || null, phone || null, phone_secondary || null,
        line_id || null, email || null, notes || null, id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

// DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ message: 'Customer deleted successfully', id });
  } catch (err) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

// GET /api/customers/:id/sites
exports.getCustomerSites = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM customer_sites WHERE customer_id = $1 ORDER BY is_default DESC, created_at ASC',
      [id]
    );
    res.json(result.rows.map(formatCustomerSite));
  } catch (err) {
    console.error('Error fetching customer sites:', err);
    res.status(500).json({ error: 'Failed to fetch customer sites' });
  }
};

// POST /api/customers/:id/sites
exports.createCustomerSite = async (req, res) => {
  try {
    const { id: customerId } = req.params;
    const {
      site_name,
      is_default = false,
      address,
      subdistrict,
      district,
      province,
      postal_code,
      latitude,
      longitude,
      map_url,
      coordinator_name,
      coordinator_phone,
      coordinator_line_id,
      site_notes
    } = req.body;

    if (!site_name || !address) {
      return res.status(400).json({ error: 'Site name and address are required' });
    }

    if (is_default) {
      await pool.query('UPDATE customer_sites SET is_default = false WHERE customer_id = $1', [customerId]);
    }

    const siteId = `site_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const result = await pool.query(
      `INSERT INTO customer_sites (
        id, customer_id, site_name, is_default, address, subdistrict, district,
        province, postal_code, latitude, longitude, map_url,
        coordinator_name, coordinator_phone, coordinator_line_id, site_notes,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
      RETURNING *`,
      [
        siteId, customerId, site_name.trim(), Boolean(is_default), address.trim(),
        subdistrict || null, district || null, province || null, postal_code || null,
        latitude || null, longitude || null, map_url || null, coordinator_name || null,
        coordinator_phone || null, coordinator_line_id || null, site_notes || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating customer site:', err);
    res.status(500).json({ error: 'Failed to create customer site' });
  }
};

// PUT /api/customer-sites/:siteId
exports.updateCustomerSite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const {
      site_name,
      is_default,
      address,
      subdistrict,
      district,
      province,
      postal_code,
      latitude,
      longitude,
      map_url,
      coordinator_name,
      coordinator_phone,
      coordinator_line_id,
      site_notes
    } = req.body;

    const currentSite = await pool.query('SELECT customer_id FROM customer_sites WHERE id = $1', [siteId]);
    if (currentSite.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    const customerId = currentSite.rows[0].customer_id;

    if (is_default) {
      await pool.query('UPDATE customer_sites SET is_default = false WHERE customer_id = $1 AND id != $2', [customerId, siteId]);
    }

    const result = await pool.query(
      `UPDATE customer_sites SET
        site_name = COALESCE($1, site_name),
        is_default = COALESCE($2, is_default),
        address = COALESCE($3, address),
        subdistrict = $4,
        district = $5,
        province = $6,
        postal_code = $7,
        latitude = $8,
        longitude = $9,
        map_url = $10,
        coordinator_name = $11,
        coordinator_phone = $12,
        coordinator_line_id = $13,
        site_notes = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *`,
      [
        site_name ? site_name.trim() : null, is_default !== undefined ? Boolean(is_default) : null,
        address ? address.trim() : null, subdistrict || null, district || null,
        province || null, postal_code || null, latitude || null, longitude || null,
        map_url || null, coordinator_name || null, coordinator_phone || null,
        coordinator_line_id || null, site_notes || null, siteId
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating customer site:', err);
    res.status(500).json({ error: 'Failed to update customer site' });
  }
};

// DELETE /api/customer-sites/:siteId
exports.deleteCustomerSite = async (req, res) => {
  try {
    const { siteId } = req.params;
    const result = await pool.query('DELETE FROM customer_sites WHERE id = $1 RETURNING id, customer_id', [siteId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }
    res.json({ message: 'Site deleted successfully', id: siteId });
  } catch (err) {
    console.error('Error deleting customer site:', err);
    res.status(500).json({ error: 'Failed to delete customer site' });
  }
};
