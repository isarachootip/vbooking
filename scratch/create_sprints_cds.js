import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  const projectId = 'p_1781075485429'; // cds_stk (correct ID)

  // Get all tasks grouped by phase/date for smart sprint planning
  const tasks = await client.query(
    `SELECT id, title, status, priority, start_date, end_date, estimated_hours, sprint_id 
     FROM tasks WHERE project_id = $1 ORDER BY start_date, title`,
    [projectId]
  );
  console.log(`Total tasks: ${tasks.rows.length}`);

  // Clean up wrongly created sprints from wrong project
  await client.query("DELETE FROM sprints WHERE id LIKE 's_sprint%_cds'");
  // Also clean up any existing sprints for this project
  await client.query("DELETE FROM sprints WHERE project_id = $1", [projectId]);
  // Reset all sprint_id on tasks
  await client.query("UPDATE tasks SET sprint_id = NULL WHERE project_id = $1", [projectId]);
  console.log('Cleared old sprints and reset task assignments.');

  // Group tasks by timeline phases
  const sprints = [
    {
      id: 's_cds_sp1',
      name: 'Sprint 1 - Kickoff & Setup',
      status: 'Active',
      startDate: '2026-06-01',
      endDate: '2026-06-22',
      // Phase 1 setup + Infrastructure basics
      taskPattern: ['S1', 'S2', 'S3', 'S4', 'ph1_setup', 'I1', 'I2', 'I4', 'I5', 'I6', 'I7', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'Kick off', 'SOW']
    },
    {
      id: 's_cds_sp2',
      name: 'Sprint 2 - Chat Core & Inbox',
      status: 'Planned',
      startDate: '2026-06-23',
      endDate: '2026-07-13',
      taskPattern: ['ph2_infra', 'ph3_core', 'C1', 'C2', 'C3', 'C4', 'C5', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12', 'C15', 'C16', 'C17']
    },
    {
      id: 's_cds_sp3',
      name: 'Sprint 3 - Advanced Features',
      status: 'Planned',
      startDate: '2026-07-14',
      endDate: '2026-08-10',
      taskPattern: ['C6', 'C13', 'C14', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D22', 'API Contract', 'ph4_adv']
    },
    {
      id: 's_cds_sp4',
      name: 'Sprint 4 - Reports & Backend',
      status: 'Planned',
      startDate: '2026-08-11',
      endDate: '2026-08-31',
      taskPattern: ['D24', 'C18', 'D17', 'D18', 'D19', 'D20', 'D21', 'Core Backend', 'ph5_rep']
    },
    {
      id: 's_cds_sp5',
      name: 'Sprint 5 - Phase 2 Integrations',
      status: 'Planned',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      taskPattern: ['D14', 'D15', 'D16', 'D23', 'D25', 'M', 'ph6_int', 'ph7']
    },
    {
      id: 's_cds_sp6',
      name: 'Sprint 6 - Testing & Go-Live',
      status: 'Planned',
      startDate: '2026-10-01',
      endDate: '2026-10-20',
      taskPattern: ['SIT', 'U1', 'U2', 'U3', 'U4', 'U5', 'ph8', 'ph9', 'ph10']
    }
  ];

  for (const s of sprints) {
    // Create sprint
    await client.query(
      `INSERT INTO sprints (id, project_id, name, status, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6)`,
      [s.id, projectId, s.name, s.status, s.startDate, s.endDate]
    );

    // Match tasks by pattern in id or title
    let assigned = 0;
    for (const task of tasks.rows) {
      const matched = s.taskPattern.some(pat => 
        task.id.includes(pat) || task.title.includes(pat)
      );
      if (matched) {
        await client.query("UPDATE tasks SET sprint_id = $1 WHERE id = $2", [s.id, task.id]);
        task.sprint_id = s.id; // mark as assigned to avoid re-assigning
        assigned++;
      }
    }
    console.log(`✅ ${s.name} (${s.startDate} → ${s.endDate}) → ${assigned} tasks`);
  }

  // Assign remaining unassigned tasks based on dates
  const unassigned = tasks.rows.filter(t => !t.sprint_id);
  console.log(`\nUnassigned tasks remaining: ${unassigned.length}`);
  for (const t of unassigned) {
    if (!t.start_date) {
      // No date - put in Sprint 1 (backlog)
      await client.query("UPDATE tasks SET sprint_id = $1 WHERE id = $2", ['s_cds_sp1', t.id]);
      continue;
    }
    const startStr = t.start_date instanceof Date ? t.start_date.toISOString().slice(0,10) : String(t.start_date).slice(0,10);
    // Find matching sprint by date
    let placed = false;
    for (const s of sprints) {
      if (startStr >= s.startDate && startStr <= s.endDate) {
        await client.query("UPDATE tasks SET sprint_id = $1 WHERE id = $2", [s.id, t.id]);
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Put late tasks in last sprint
      await client.query("UPDATE tasks SET sprint_id = $1 WHERE id = $2", ['s_cds_sp6', t.id]);
    }
  }

  // Final summary
  const summary = await client.query(
    `SELECT s.name, s.status, s.start_date, s.end_date, COUNT(t.id) as cnt 
     FROM sprints s LEFT JOIN tasks t ON t.sprint_id = s.id 
     WHERE s.project_id = $1 
     GROUP BY s.id, s.name, s.status, s.start_date, s.end_date 
     ORDER BY s.start_date`,
    [projectId]
  );
  console.log('\n=== Final Sprint Summary ===');
  for (const r of summary.rows) {
    const sd = r.start_date ? String(r.start_date).slice(0,10) : 'N/A';
    const ed = r.end_date ? String(r.end_date).slice(0,10) : 'N/A';
    console.log(`  ${r.name} | ${r.status} | ${sd} → ${ed} | ${r.cnt} tasks`);
  }

  client.release();
  await pool.end();
  console.log('\n✅ Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
