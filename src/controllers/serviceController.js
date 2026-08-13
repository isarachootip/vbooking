const pool = require('../../testdb.js');

exports.getPricebook = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM service_price_book ORDER BY category ASC, service_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch price book' });
  }
};

exports.addPriceItem = async (req, res) => {
  const { id, category, service_name, unit_type, material_cost, labor_cost, selling_price, is_active } = req.body;
  try {
    await pool.query(
      `INSERT INTO service_price_book (id, category, service_name, unit_type, material_cost, labor_cost, selling_price, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, category, service_name, unit_type, material_cost, labor_cost, selling_price, is_active]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add price item' });
  }
};

exports.updatePriceItem = async (req, res) => {
  const { category, service_name, unit_type, material_cost, labor_cost, selling_price, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE service_price_book 
       SET category = $1, service_name = $2, unit_type = $3, material_cost = $4, labor_cost = $5, selling_price = $6, is_active = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8`,
      [category, service_name, unit_type, material_cost, labor_cost, selling_price, is_active, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update price item' });
  }
};

exports.deletePriceItem = async (req, res) => {
  try {
    await pool.query('DELETE FROM service_price_book WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete price item' });
  }
};
