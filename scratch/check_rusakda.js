import pg from 'pg';

const connectionString = 'postgresql://isara_admin:MySecretPass123!@187.77.147.16:5432/timesheet_db';
const pool = new pg.Pool({ connectionString });

async function check() {
  try {
    const userRes = await pool.query("SELECT * FROM users WHERE email = 'rusakda@central.co.th'");
    console.log("User record:", JSON.stringify(userRes.rows[0], null, 2));
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;
      
      // Let's check which projects they are a member of
      const projRes = await pool.query("SELECT id, name, members FROM projects");
      console.log("\n--- Projects they are member of ---");
      for (const row of projRes.rows) {
        const members = row.members || [];
        const member = members.find(m => m.userId === userId);
        if (member) {
          console.log(`Project: ${row.name} (ID: ${row.id}), Role: ${member.role}`);
        }
      }

      // Check their timesheet entries
      const tsRes = await pool.query("SELECT * FROM timesheets WHERE user_id = $1 LIMIT 5", [userId]);
      console.log("\n--- Timesheets (limit 5) ---");
      console.log(JSON.stringify(tsRes.rows, null, 2));
    } else {
      console.log("No user found with email rusakda@central.co.th");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();
