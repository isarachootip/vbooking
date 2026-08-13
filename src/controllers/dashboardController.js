const pool = require('../../testdb.js');

exports.getDashboardSummary = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear().toString();
    
    // 1. Financial Overview (Yearly)
    // Revenue from Projects (Sum of budget or project_value for Active/Done projects)
    const revenueRes = await pool.query(`
      SELECT SUM(budget) as total_revenue, COUNT(id) as project_count
      FROM projects 
      WHERE start_date LIKE $1 || '%' OR status = 'Done'
    `, [currentYear]);
    const totalRevenue = parseFloat(revenueRes.rows[0].total_revenue || 0);
    const projectCount = parseInt(revenueRes.rows[0].project_count || 0);

    // Pipeline from Quotations (Draft, Sent)
    const pipelineRes = await pool.query(`
      SELECT SUM(grand_total) as pipeline_value, COUNT(id) as quote_count
      FROM quotations 
      WHERE status IN ('Draft', 'Sent')
    `);
    const pipelineValue = parseFloat(pipelineRes.rows[0].pipeline_value || 0);

    // 2. Sales Performance (Leads Funnel)
    const funnelRes = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM leads 
      GROUP BY status
    `);
    
    const funnel = {
      Total: 0,
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Converted: 0,
      Lost: 0
    };
    
    funnelRes.rows.forEach(row => {
      const stat = row.status;
      const count = parseInt(row.count);
      if (funnel[stat] !== undefined) {
        funnel[stat] = count;
      }
      funnel.Total += count;
    });

    const conversionRate = funnel.Total > 0 ? ((funnel.Converted / funnel.Total) * 100).toFixed(1) : 0;

    // 3. Operations Performance (Project Status Breakdown)
    const projectStatusRes = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM projects 
      GROUP BY status
    `);
    
    const projectHealth = {
      Planning: 0,
      Active: 0,
      'In Progress': 0, // Fallback for old status
      Done: 0,
      Delayed: 0
    };
    
    projectStatusRes.rows.forEach(row => {
      const stat = row.status;
      const count = parseInt(row.count);
      if (projectHealth[stat] !== undefined) {
        projectHealth[stat] += count;
      } else {
        // Group unknown active statuses into Active
        if (stat !== 'Done' && stat !== 'Planning') {
          projectHealth.Active += count;
        }
      }
    });

    res.json({
      financial: {
        totalRevenue,
        pipelineValue,
        projectCount,
        year: currentYear
      },
      sales: {
        funnel,
        conversionRate
      },
      operations: {
        projectHealth
      }
    });

  } catch (err) {
    console.error('Error fetching dashboard summary:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};
