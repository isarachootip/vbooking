const pool = require('../src/config/db.cjs');

async function main() {
  console.log('🔄 Updating branch codes to purely numeric digits...');

  const branchesRes = await pool.query(`SELECT id, code, name FROM branches`);
  console.log(`Found ${branchesRes.rows.length} branches to update.`);

  let updatedCount = 0;
  for (const b of branchesRes.rows) {
    // Extract numbers from id (e.g. 'br-st-60016' -> '60016')
    let numCode = b.id.replace(/\D/g, '');
    if (!numCode && b.code) {
      numCode = b.code.replace(/\D/g, '');
    }

    if (numCode) {
      await pool.query(
        `UPDATE branches SET code = $1 WHERE id = $2`,
        [numCode, b.id]
      );
      await pool.query(
        `UPDATE master_branches SET code = $1 WHERE id = $2`,
        [numCode, b.id]
      );
      updatedCount++;
    }
  }

  console.log(`✅ Updated ${updatedCount} branches with numeric codes.`);

  const sample = await pool.query(`
    SELECT id, code, name, province 
    FROM branches 
    ORDER BY code ASC 
    LIMIT 15
  `);
  console.log('Sample updated branches:');
  console.table(sample.rows);
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error updating branch codes:', err);
    process.exit(1);
  });
