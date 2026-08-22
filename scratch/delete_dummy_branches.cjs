const pool = require('../src/config/db.cjs');

async function main() {
  const idsToDelete = ['br-01', 'br-02', 'br-03', 'br-04'];
  console.log('🗑️ Deleting dummy branches:', idsToDelete);

  const d1 = await pool.query(
    `DELETE FROM branches WHERE id = ANY($1::varchar[]) RETURNING id, code, name`,
    [idsToDelete]
  );
  console.log('Deleted from branches table:', d1.rows);

  const d2 = await pool.query(
    `DELETE FROM master_branches WHERE id = ANY($1::varchar[]) RETURNING id, code, name`,
    [idsToDelete]
  );
  console.log('Deleted from master_branches table:', d2.rows);

  const countRes = await pool.query(`SELECT COUNT(*) FROM branches`);
  console.log(`✅ Total remaining branches: ${countRes.rows[0].count}`);

  const sample = await pool.query(`SELECT id, code, name, province FROM branches ORDER BY id ASC LIMIT 5`);
  console.log('Sample top 5 remaining branches:', sample.rows);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
