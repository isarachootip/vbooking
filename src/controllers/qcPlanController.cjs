const pool = require('../config/db.cjs');

// Haversine Distance Formula in Kilometers (Fallback / Baseline)
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const numLat1 = parseFloat(lat1);
  const numLon1 = parseFloat(lon1);
  const numLat2 = parseFloat(lat2);
  const numLon2 = parseFloat(lon2);
  if (isNaN(numLat1) || isNaN(numLon1) || isNaN(numLat2) || isNaN(numLon2)) return 0;

  const R = 6371; // Earth's radius in km
  const dLat = ((numLat2 - numLat1) * Math.PI) / 180;
  const dLon = ((numLon2 - numLon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((numLat1 * Math.PI) / 180) *
      Math.cos((numLat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

// Estimate driving duration in minutes (avg 35 km/h in city traffic + 5 min traffic buffer)
function estimateDriveTimeMin(distanceKm) {
  if (!distanceKm || distanceKm <= 0) return 5;
  return Math.round((distanceKm / 35) * 60 + 5);
}

// Google Maps Distance Matrix API (Real road network + Live traffic)
async function getGoogleDrivingMetrics(originLat, originLng, destLat, destLng) {
  let apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    try {
      const settingRes = await pool.query("SELECT setting_value FROM system_settings WHERE setting_key = 'google_maps_api_key' LIMIT 1");
      if (settingRes.rows.length > 0 && settingRes.rows[0].setting_value) {
        apiKey = settingRes.rows[0].setting_value;
      }
    } catch (e) {
      // ignore
    }
  }

  if (!apiKey || apiKey.trim() === '') {
    const dist = calculateDistanceKm(originLat, originLng, destLat, destLng);
    return { distanceKm: dist, durationMin: estimateDriveTimeMin(dist), source: 'haversine' };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey.trim()}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
        const el = data.rows[0].elements[0];
        const distKm = Math.round((el.distance.value / 1000) * 10) / 10;
        const durSec = el.duration_in_traffic ? el.duration_in_traffic.value : el.duration.value;
        const durMin = Math.max(1, Math.round(durSec / 60));
        return { distanceKm: distKm, durationMin: durMin, source: 'google_maps_matrix' };
      }
    }
  } catch (err) {
    console.warn('Google Maps Matrix API request failed, falling back to Haversine:', err.message);
  }

  const fallbackDist = calculateDistanceKm(originLat, originLng, destLat, destLng);
  return { distanceKm: fallbackDist, durationMin: estimateDriveTimeMin(fallbackDist), source: 'haversine_fallback' };
}

// 1. Get Daily Plans (with nested items)
exports.getDailyPlans = async (req, res) => {
  try {
    const { qcId, date, status } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT p.*, 
             u.name as qc_name, 
             u.avatar as qc_avatar,
             u.phones as qc_phones,
             u.home_latitude as qc_home_lat,
             u.home_longitude as qc_home_lng,
             u.home_address as qc_home_address
      FROM qc_daily_plans p
      LEFT JOIN users u ON p.qc_id = u.id
      WHERE p.plan_date = $1
    `;
    const params = [targetDate];
    let paramIndex = 2;

    if (qcId && qcId !== 'ALL') {
      query += ` AND p.qc_id = $${paramIndex}`;
      params.push(qcId);
      paramIndex++;
    }

    if (status && status !== 'ALL') {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY p.created_at ASC`;

    const plansResult = await pool.query(query, params);

    // Fetch items for all retrieved plans
    const plans = [];
    for (const planRow of plansResult.rows) {
      const itemsResult = await pool.query(
        `SELECT i.*, 
                l.customer_name as lead_customer_name, 
                l.customer_phone as lead_customer_phone,
                l.customer_address as lead_customer_address,
                l.job_type as lead_job_type,
                pr.name as project_name,
                pr.address as project_address
         FROM qc_plan_items i
         LEFT JOIN leads l ON i.lead_id = l.id
         LEFT JOIN projects pr ON i.project_id = pr.id
         WHERE i.plan_id = $1
         ORDER BY i.sequence_order ASC`,
        [planRow.id]
      );

      const items = itemsResult.rows.map(item => ({
        id: item.id,
        planId: item.plan_id,
        leadId: item.lead_id,
        projectId: item.project_id,
        sequenceOrder: parseInt(item.sequence_order) || 1,
        timeSlot: item.time_slot || '09:00 - 11:30',
        siteName: item.site_name || item.project_name || item.lead_customer_name || 'Site งาน',
        customerName: item.customer_name || item.lead_customer_name || '',
        customerPhone: item.customer_phone || item.lead_customer_phone || '',
        siteAddress: item.site_address || item.project_address || item.lead_customer_address || '',
        siteLatitude: parseFloat(item.site_latitude) || 0,
        siteLongitude: parseFloat(item.site_longitude) || 0,
        estimatedDistanceFromPrevKm: parseFloat(item.estimated_distance_from_prev_km) || 0,
        estimatedDurationMin: estimateDriveTimeMin(parseFloat(item.estimated_distance_from_prev_km) || 0),
        status: item.status || 'Pending',
        checkInTime: item.check_in_time,
        checkOutTime: item.check_out_time,
        actualCheckInLat: item.actual_check_in_lat ? parseFloat(item.actual_check_in_lat) : null,
        actualCheckInLng: item.actual_check_in_lng ? parseFloat(item.actual_check_in_lng) : null,
        qcInspectionId: item.qc_inspection_id,
        notes: item.notes || '',
        createdAt: item.created_at
      }));

      plans.push({
        id: planRow.id,
        qcId: planRow.qc_id,
        qcName: planRow.qc_name || 'QC Inspector',
        qcAvatar: planRow.qc_avatar || '',
        qcPhone: (planRow.qc_phones && planRow.qc_phones[0]) || '',
        planDate: planRow.plan_date,
        originLatitude: parseFloat(planRow.origin_latitude) || 13.7563,
        originLongitude: parseFloat(planRow.origin_longitude) || 100.5018,
        originAddress: planRow.origin_address || planRow.qc_home_address || 'บ้านพนักงาน (Origin)',
        totalEstimatedKm: parseFloat(planRow.total_estimated_km) || 0,
        totalEstimatedDurationMin: parseInt(planRow.total_estimated_duration_min) || 0,
        status: planRow.status || 'Confirmed',
        notes: planRow.notes || '',
        items: items,
        createdAt: planRow.created_at,
        updatedAt: planRow.updated_at,
        createdBy: planRow.created_by
      });
    }

    res.json(plans);
  } catch (err) {
    console.error('Error fetching QC daily plans:', err);
    res.status(500).json({ error: 'Failed to fetch QC daily plans' });
  }
};

// 2. Generate or Optimize QC Daily Plan from Home Origin
exports.generateDailyPlan = async (req, res) => {
  try {
    const { qc_id, plan_date, override_origin_lat, override_origin_lng, override_origin_address, auto_fetch_approved } = req.body;
    
    if (!qc_id) {
      return res.status(400).json({ error: 'QC Inspector ID is required' });
    }

    const targetDate = plan_date || new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // 1. Fetch QC User details for Home Origin
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [qc_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'QC User not found' });
    }
    const qcUser = userRes.rows[0];

    // Determine Origin point (Home coordinates)
    const originLat = override_origin_lat != null && !isNaN(Number(override_origin_lat))
      ? parseFloat(override_origin_lat)
      : (qcUser.home_latitude != null ? parseFloat(qcUser.home_latitude) : 13.7563);

    const originLng = override_origin_lng != null && !isNaN(Number(override_origin_lng))
      ? parseFloat(override_origin_lng)
      : (qcUser.home_longitude != null ? parseFloat(qcUser.home_longitude) : 100.5018);

    const originAddr = override_origin_address || qcUser.home_address || 'บ้านพนักงาน (Origin Point)';

    // 2. Check if a plan already exists for this QC & Date
    const existingPlanRes = await pool.query(
      'SELECT * FROM qc_daily_plans WHERE qc_id = $1 AND plan_date = $2',
      [qc_id, targetDate]
    );

    let planId = existingPlanRes.rows.length > 0 ? existingPlanRes.rows[0].id : `qcp_${Date.now()}`;

    // Collect candidate sites to schedule
    let candidateSites = [];

    // If existing plan has items, keep them
    if (existingPlanRes.rows.length > 0) {
      const existingItemsRes = await pool.query(
        'SELECT * FROM qc_plan_items WHERE plan_id = $1',
        [planId]
      );
      candidateSites = existingItemsRes.rows.map(item => ({
        id: item.id,
        leadId: item.lead_id,
        projectId: item.project_id,
        siteName: item.site_name,
        customerName: item.customer_name,
        customerPhone: item.customer_phone,
        siteAddress: item.site_address,
        siteLatitude: parseFloat(item.site_latitude) || originLat,
        siteLongitude: parseFloat(item.site_longitude) || originLng,
        status: item.status || 'Pending',
        notes: item.notes
      }));
    }

    // Auto-fetch GM approved leads/visits if requested or if candidateSites is empty
    if (auto_fetch_approved !== false) {
      // Find leads with approved site visits or appointments on targetDate assigned to this QC or unassigned
      const approvedLeadsRes = await pool.query(
        `SELECT l.* 
         FROM leads l
         WHERE (
           (l.site_visit_approval_status = 'Approved' OR l.status IN ('Qualified', 'Approved', 'New', 'Contacted'))
           AND (l.sales_contact_id = $1 OR l.surveyor_id = $1 OR l.appointment_assignee = $2 OR l.sales_contact_id IS NULL)
           AND (l.appointment_date LIKE $3 OR l.survey_date LIKE $3 OR l.updated_at LIKE $3 OR l.created_at LIKE $3)
           AND (l.customer_latitude IS NOT NULL AND l.customer_longitude IS NOT NULL)
         )
         LIMIT 10`,
        [qc_id, qcUser.name, `${targetDate}%`]
      );

      approvedLeadsRes.rows.forEach(l => {
        const isDuplicate = candidateSites.some(c => c.leadId === l.id);
        if (!isDuplicate && l.customer_latitude && l.customer_longitude) {
          candidateSites.push({
            id: `item_ld_${l.id}`,
            leadId: l.id,
            projectId: l.project_id || null,
            siteName: `ตรวจหน้างาน: ${l.customer_name}`,
            customerName: l.customer_name,
            customerPhone: l.customer_phone || '',
            siteAddress: l.customer_address || '',
            siteLatitude: parseFloat(l.customer_latitude),
            siteLongitude: parseFloat(l.customer_longitude),
            status: 'Pending',
            notes: l.notes || l.site_visit_approval_notes || ''
          });
        }
      });

      // Find projects in QC phase
      const qcProjectsRes = await pool.query(
        `SELECT pr.* 
         FROM projects pr
         WHERE (pr.status = 'QC' OR pr.execution_phase = 'Ready for Handover' OR pr.execution_phase = 'QC Inspection')
           AND pr.site_latitude IS NOT NULL AND pr.site_longitude IS NOT NULL
         LIMIT 5`
      );

      qcProjectsRes.rows.forEach(p => {
        const isDuplicate = candidateSites.some(c => c.projectId === p.id);
        if (!isDuplicate && p.site_latitude && p.site_longitude) {
          candidateSites.push({
            id: `item_pr_${p.id}`,
            leadId: p.lead_id || null,
            projectId: p.id,
            siteName: `ตรวจส่งมอบ QC: ${p.name}`,
            customerName: p.customer_name || p.name,
            customerPhone: p.customer_phone || '',
            siteAddress: p.address || '',
            siteLatitude: parseFloat(p.site_latitude),
            siteLongitude: parseFloat(p.site_longitude),
            status: 'Pending',
            notes: p.description || ''
          });
        }
      });
    }

    // 3. Nearest-Neighbor TSP Route Optimization from Origin (Home)
    const optimizedItems = [];
    let currentLat = originLat;
    let currentLng = originLng;
    let remaining = [...candidateSites];
    let totalKm = 0;

    // Time slots template
    const timeSlots = [
      '09:00 - 11:00 น.',
      '11:30 - 13:30 น.',
      '14:00 - 16:00 น.',
      '16:30 - 18:30 น.'
    ];

    let seq = 1;
    while (remaining.length > 0) {
      // Find nearest site from currentLat, currentLng
      let bestIndex = 0;
      let minDistance = calculateDistanceKm(currentLat, currentLng, remaining[0].siteLatitude, remaining[0].siteLongitude);

      for (let i = 1; i < remaining.length; i++) {
        const dist = calculateDistanceKm(currentLat, currentLng, remaining[i].siteLatitude, remaining[i].siteLongitude);
        if (dist < minDistance) {
          minDistance = dist;
          bestIndex = i;
        }
      }

      const nextStop = remaining.splice(bestIndex, 1)[0];
      
      // Calculate driving metrics (Google Matrix if key configured, or Haversine fallback)
      const drivingMetrics = await getGoogleDrivingMetrics(
        currentLat,
        currentLng,
        nextStop.siteLatitude,
        nextStop.siteLongitude
      );

      const actualDistanceKm = drivingMetrics.distanceKm || minDistance;
      totalKm += actualDistanceKm;

      const uniqueItemId = `qcit_${planId}_${nextStop.leadId || nextStop.projectId || 'stop'}_${seq}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

      optimizedItems.push({
        id: uniqueItemId,
        planId: planId,
        leadId: nextStop.leadId || null,
        projectId: nextStop.projectId || null,
        sequenceOrder: seq,
        timeSlot: timeSlots[seq - 1] || `${8 + seq * 2}:00 - ${10 + seq * 2}:00 น.`,
        siteName: nextStop.siteName,
        customerName: nextStop.customerName,
        customerPhone: nextStop.customerPhone,
        siteAddress: nextStop.siteAddress,
        siteLatitude: nextStop.siteLatitude,
        siteLongitude: nextStop.siteLongitude,
        estimatedDistanceFromPrevKm: actualDistanceKm,
        estimatedDurationMin: drivingMetrics.durationMin || estimateDriveTimeMin(actualDistanceKm),
        status: nextStop.status || 'Pending',
        notes: nextStop.notes || ''
      });

      currentLat = nextStop.siteLatitude;
      currentLng = nextStop.siteLongitude;
      seq++;
    }

    const totalEstDurationMin = Math.round(
      optimizedItems.reduce((acc, it) => acc + (it.estimatedDurationMin || 15), 0) + optimizedItems.length * 75
    ); // Travel duration + 75 min per inspection

    // 4. Save/Upsert Plan into Database
    if (existingPlanRes.rows.length > 0) {
      await pool.query(
        `UPDATE qc_daily_plans
         SET origin_latitude = $1, origin_longitude = $2, origin_address = $3,
             total_estimated_km = $4, total_estimated_duration_min = $5, updated_at = $6
         WHERE id = $7`,
        [originLat, originLng, originAddr, totalKm, totalEstDurationMin, now, planId]
      );
      // Delete old items and insert fresh optimized sequence
      await pool.query('DELETE FROM qc_plan_items WHERE plan_id = $1', [planId]);
    } else {
      await pool.query(
        `INSERT INTO qc_daily_plans
           (id, qc_id, plan_date, origin_latitude, origin_longitude, origin_address, total_estimated_km, total_estimated_duration_min, status, created_at, updated_at, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           origin_latitude = EXCLUDED.origin_latitude,
           origin_longitude = EXCLUDED.origin_longitude,
           total_estimated_km = EXCLUDED.total_estimated_km,
           total_estimated_duration_min = EXCLUDED.total_estimated_duration_min,
           updated_at = NOW()`,
        [planId, qc_id, targetDate, originLat, originLng, originAddr, totalKm, totalEstDurationMin, 'Confirmed', now, now, req.headers['x-user-id'] || 'GM']
      );
    }

    // Insert optimized items
    for (const item of optimizedItems) {
      await pool.query(
        `INSERT INTO qc_plan_items
           (id, plan_id, lead_id, project_id, sequence_order, time_slot, site_name, customer_name, customer_phone, site_address, site_latitude, site_longitude, estimated_distance_from_prev_km, status, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           sequence_order = EXCLUDED.sequence_order,
           time_slot = EXCLUDED.time_slot,
           estimated_distance_from_prev_km = EXCLUDED.estimated_distance_from_prev_km,
           status = EXCLUDED.status`,
        [
          item.id, planId, item.leadId, item.projectId, item.sequenceOrder, item.timeSlot,
          item.siteName, item.customerName, item.customerPhone, item.siteAddress,
          item.siteLatitude, item.siteLongitude, item.estimatedDistanceFromPrevKm,
          item.status, item.notes, now
        ]
      );
    }

    // Return full plan response
    res.json({
      id: planId,
      qcId: qc_id,
      qcName: qcUser.name,
      qcAvatar: qcUser.avatar,
      planDate: targetDate,
      originLatitude: originLat,
      originLongitude: originLng,
      originAddress: originAddr,
      totalEstimatedKm: totalKm,
      totalEstimatedDurationMin: totalEstDurationMin,
      status: 'Confirmed',
      items: optimizedItems,
      createdAt: now,
      updatedAt: now
    });
  } catch (err) {
    console.error('Error generating QC daily plan:', err);
    res.status(500).json({ error: 'Failed to generate QC daily plan: ' + err.message });
  }
};

// 3. Update Item Status (Travelling, Checked In, Completed, Skipped)
exports.updatePlanItemStatus = async (req, res) => {
  try {
    const { planId, itemId } = req.params;
    const { status, notes } = req.body;
    const now = new Date().toISOString();

    const updateRes = await pool.query(
      `UPDATE qc_plan_items 
       SET status = COALESCE($1, status),
           notes = COALESCE($2, notes)
       WHERE id = $3 AND plan_id = $4
       RETURNING *`,
      [status, notes, itemId, planId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item not found' });
    }

    // If item is Completed, check if all items in plan are completed
    if (status === 'Completed') {
      const remainingRes = await pool.query(
        `SELECT COUNT(*) FROM qc_plan_items WHERE plan_id = $1 AND status != 'Completed' AND status != 'Skipped'`,
        [planId]
      );
      if (parseInt(remainingRes.rows[0].count) === 0) {
        await pool.query(`UPDATE qc_daily_plans SET status = 'Completed', updated_at = $1 WHERE id = $2`, [now, planId]);
      } else {
        await pool.query(`UPDATE qc_daily_plans SET status = 'In Progress', updated_at = $1 WHERE id = $2`, [now, planId]);
      }
    }

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('Error updating plan item status:', err);
    res.status(500).json({ error: 'Failed to update item status' });
  }
};

// 4. GPS Check-in on Site
exports.checkInPlanItem = async (req, res) => {
  try {
    const { planId, itemId } = req.params;
    const { actual_lat, actual_lng } = req.body;
    const now = new Date().toISOString();

    const itemRes = await pool.query('SELECT * FROM qc_plan_items WHERE id = $1 AND plan_id = $2', [itemId, planId]);
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan item not found' });
    }
    const item = itemRes.rows[0];

    // Calculate distance from target site in meters
    let distanceToSiteMeters = 0;
    if (actual_lat && actual_lng && item.site_latitude && item.site_longitude) {
      const distKm = calculateDistanceKm(actual_lat, actual_lng, item.site_latitude, item.site_longitude);
      distanceToSiteMeters = Math.round(distKm * 1000);
    }

    const updateRes = await pool.query(
      `UPDATE qc_plan_items 
       SET status = 'Checked In',
           check_in_time = $1,
           actual_check_in_lat = $2,
           actual_check_in_lng = $3
       WHERE id = $4 AND plan_id = $5
       RETURNING *`,
      [now, actual_lat || null, actual_lng || null, itemId, planId]
    );

    // Also update plan status to 'In Progress'
    await pool.query(`UPDATE qc_daily_plans SET status = 'In Progress', updated_at = $1 WHERE id = $2`, [now, planId]);

    res.json({
      success: true,
      item: updateRes.rows[0],
      distanceToSiteMeters: distanceToSiteMeters,
      isWithinGeofence: distanceToSiteMeters <= 500 // 500 meter geofence
    });
  } catch (err) {
    console.error('Error checking in QC plan item:', err);
    res.status(500).json({ error: 'Failed to record GPS check-in' });
  }
};

// 5. Reorder Plan Items
exports.reorderPlanItems = async (req, res) => {
  try {
    const { planId } = req.params;
    const { items } = req.body; // Array of { id, sequence_order }
    const now = new Date().toISOString();

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    for (const it of items) {
      await pool.query(
        `UPDATE qc_plan_items SET sequence_order = $1 WHERE id = $2 AND plan_id = $3`,
        [it.sequence_order, it.id, planId]
      );
    }

    // Fetch plan details to recalculate total distance
    const planRes = await pool.query('SELECT * FROM qc_daily_plans WHERE id = $1', [planId]);
    if (planRes.rows.length > 0) {
      const plan = planRes.rows[0];
      const allItemsRes = await pool.query(
        'SELECT * FROM qc_plan_items WHERE plan_id = $1 ORDER BY sequence_order ASC',
        [planId]
      );

      let currentLat = parseFloat(plan.origin_latitude);
      let currentLng = parseFloat(plan.origin_longitude);
      let totalKm = 0;

      for (const it of allItemsRes.rows) {
        const metrics = await getGoogleDrivingMetrics(currentLat, currentLng, it.site_latitude, it.site_longitude);
        const dist = metrics.distanceKm || calculateDistanceKm(currentLat, currentLng, it.site_latitude, it.site_longitude);
        totalKm += dist;
        await pool.query(
          `UPDATE qc_plan_items SET estimated_distance_from_prev_km = $1 WHERE id = $2`,
          [dist, it.id]
        );
        currentLat = parseFloat(it.site_latitude);
        currentLng = parseFloat(it.site_longitude);
      }

      await pool.query(
        `UPDATE qc_daily_plans SET total_estimated_km = $1, updated_at = $2 WHERE id = $3`,
        [totalKm, now, planId]
      );
    }

    res.json({ success: true, message: 'Plan items reordered and distances updated' });
  } catch (err) {
    console.error('Error reordering plan items:', err);
    res.status(500).json({ error: 'Failed to reorder plan items' });
  }
};

// 6. Manually Add Site to Plan
exports.addPlanItem = async (req, res) => {
  try {
    const { planId } = req.params;
    const { 
      site_name, customer_name, customer_phone, site_address, 
      site_latitude, site_longitude, time_slot, lead_id, project_id, notes 
    } = req.body;
    const now = new Date().toISOString();

    const countRes = await pool.query('SELECT COUNT(*) FROM qc_plan_items WHERE plan_id = $1', [planId]);
    const nextSeq = parseInt(countRes.rows[0].count) + 1;
    const itemId = `item_${Date.now()}_${nextSeq}`;

    const insertRes = await pool.query(
      `INSERT INTO qc_plan_items
         (id, plan_id, lead_id, project_id, sequence_order, time_slot, site_name, customer_name, customer_phone, site_address, site_latitude, site_longitude, status, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        itemId, planId, lead_id || null, project_id || null, nextSeq, time_slot || '14:00 - 16:00 น.',
        site_name || customer_name || 'Site งาน', customer_name || '', customer_phone || '',
        site_address || '', site_latitude || 13.7563, site_longitude || 100.5018,
        'Pending', notes || '', now
      ]
    );

    res.json(insertRes.rows[0]);
  } catch (err) {
    console.error('Error adding plan item:', err);
    res.status(500).json({ error: 'Failed to add plan item' });
  }
};

// 7. Delete Plan Item
exports.deletePlanItem = async (req, res) => {
  try {
    const { planId, itemId } = req.params;
    await pool.query('DELETE FROM qc_plan_items WHERE id = $1 AND plan_id = $2', [itemId, planId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting plan item:', err);
    res.status(500).json({ error: 'Failed to delete plan item' });
  }
};

// 8. Update Plan Header (e.g. Origin override or Status)
exports.updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const { origin_latitude, origin_longitude, origin_address, status, notes } = req.body;
    const now = new Date().toISOString();

    const updateRes = await pool.query(
      `UPDATE qc_daily_plans
       SET origin_latitude = COALESCE($1, origin_latitude),
           origin_longitude = COALESCE($2, origin_longitude),
           origin_address = COALESCE($3, origin_address),
           status = COALESCE($4, status),
           notes = COALESCE($5, notes),
           updated_at = $6
       WHERE id = $7
       RETURNING *`,
      [origin_latitude, origin_longitude, origin_address, status, notes, now, planId]
    );

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json(updateRes.rows[0]);
  } catch (err) {
    console.error('Error updating QC plan:', err);
    res.status(500).json({ error: 'Failed to update QC plan' });
  }
};

// 9. Get Team Schedule & Time Slot Availability for a given date
exports.getTeamSchedule = async (req, res) => {
  try {
    const { date } = req.query;
    let targetDate = (date || new Date().toISOString().split('T')[0]).trim();
    if (targetDate.includes('/')) {
      const parts = targetDate.split('/');
      if (parts.length === 3) {
        targetDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // 1. Get all QC department users (QC1 - QC10)
    const usersRes = await pool.query(
      `SELECT id, name, email, avatar, global_role, department, job_types,
              assigned_branches, service_zones, assigned_zones, home_address, phones
       FROM users 
       WHERE department ILIKE '%QC%' 
          OR global_role ILIKE '%QC%' 
          OR name ILIKE 'QC%'
       ORDER BY name ASC`
    );

    // Natural sort users by name (QC1, QC2, ... QC10)
    usersRes.rows.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    // Standard daily slots
    const standardSlots = [
      { slot: '09:00 - 11:00 น.', label: 'ช่วงเช้า 1 (09:00 - 11:00)' },
      { slot: '11:30 - 13:30 น.', label: 'ช่วงเที่ยง (11:30 - 13:30)' },
      { slot: '14:00 - 16:00 น.', label: 'ช่วงบ่าย (14:00 - 16:00)' },
      { slot: '16:30 - 18:30 น.', label: 'ช่วงเย็น (16:30 - 18:30)' }
    ];

    // 2. Fetch all users (for branch/store matching)
    const allUsersRes = await pool.query(
      `SELECT id, name, department, global_role, assigned_branches, service_zones FROM users`
    );
    const allUsers = allUsersRes.rows;

    // 3. Fetch all daily plan items on targetDate
    const planItemsRes = await pool.query(
      `SELECT i.*, p.qc_id, p.plan_date
       FROM qc_plan_items i
       JOIN qc_daily_plans p ON i.plan_id = p.id
       WHERE p.plan_date = $1`,
      [targetDate]
    );

    // 4. Fetch all leads with appointment on targetDate
    const leadsRes = await pool.query(
      `SELECT id, customer_name, customer_phone, customer_address, job_type, 
              appointment_date, appointment_type, appointment_assignee, surveyor_id,
              site_visit_approval_status, status, sales_contact_id
       FROM leads
       WHERE (appointment_date LIKE $1 OR survey_date LIKE $1)`,
      [`${targetDate}%`]
    );

    // 5. Fetch all followups on targetDate
    const followupsRes = await pool.query(
      `SELECT * FROM lead_followups 
       WHERE (appointment_date LIKE $1 OR created_at LIKE $1)`,
      [`${targetDate}%`]
    );

    const getLeadBranchName = (lead) => {
      if (lead.sales_contact_id) {
        const u = allUsers.find(x => x.id === lead.sales_contact_id);
        if (u && u.assigned_branches && u.assigned_branches.length > 0) return u.assigned_branches[0];
        if (u && u.name) {
          const m = u.name.match(/\(([^)]+)\)/);
          if (m) return m[1];
        }
      }
      if (lead.appointment_assignee) {
        const u = allUsers.find(x => x.name === lead.appointment_assignee || x.id === lead.appointment_assignee);
        if (u && u.assigned_branches && u.assigned_branches.length > 0) return u.assigned_branches[0];
        const m = lead.appointment_assignee.match(/\(([^)]+)\)/);
        if (m) return m[1];
      }
      return '';
    };

    const isLeadMatchedToQc = (lead, qcUser) => {
      // Direct assignment
      if (lead.surveyor_id && (lead.surveyor_id === qcUser.id || lead.surveyor_id === qcUser.name)) return true;
      if (lead.appointment_assignee && (lead.appointment_assignee === qcUser.name || lead.appointment_assignee === qcUser.id)) return true;
      if (lead.appointment_assignee && qcUser.name && lead.appointment_assignee.startsWith(qcUser.name.split(' ')[0])) return true;

      // Check followups
      const fws = followupsRes.rows.filter(f => f.lead_id === lead.id);
      for (const f of fws) {
        if (f.assignee_name && (f.assignee_name === qcUser.name || f.assignee_name === qcUser.id || f.assignee_name.startsWith(qcUser.name.split(' ')[0]))) return true;
        if (f.created_by && (f.created_by === qcUser.name || f.created_by.includes(qcUser.name))) return true;
      }

      // If lead is explicitly assigned to another QC, do NOT match this QC
      const otherQc = usersRes.rows.find(o => o.id !== qcUser.id && (
        lead.surveyor_id === o.id || 
        lead.surveyor_id === o.name || 
        lead.appointment_assignee === o.name || 
        (lead.appointment_assignee && lead.appointment_assignee.startsWith(o.name.split(' ')[0]))
      ));
      if (otherQc) return false;

      // Branch match
      const branchName = getLeadBranchName(lead);
      if (branchName && qcUser.assigned_branches && Array.isArray(qcUser.assigned_branches)) {
        const cleanBranch = branchName.replace(/^สาขา/, '').trim();
        const hasBranch = qcUser.assigned_branches.some(b => {
          const cleanB = b.replace(/^สาขา/, '').trim();
          return cleanB === cleanBranch || b.includes(cleanBranch) || branchName.includes(cleanB);
        });
        if (hasBranch) return true;
      }

      // Address match
      if (lead.customer_address && qcUser.assigned_branches) {
        const addr = lead.customer_address.toLowerCase();
        const hasAddrMatch = qcUser.assigned_branches.some(b => {
          const cleanB = b.replace(/^สาขา/, '').trim().toLowerCase();
          return cleanB.length >= 3 && addr.includes(cleanB);
        });
        if (hasAddrMatch) return true;
      }

      return false;
    };

    const getSlotIndexFromTimeStr = (timeStr) => {
      if (!timeStr) return -1;
      const str = timeStr.trim();
      if (str.includes('09:00') || str.includes('ช่วงเช้า')) return 0;
      if (str.includes('11:30') || str.includes('ช่วงเที่ยง')) return 1;
      if (str.includes('14:00') || str.includes('ช่วงบ่าย')) return 2;
      if (str.includes('16:30') || str.includes('ช่วงเย็น')) return 3;

      const m = str.match(/(\d{1,2}):(\d{2})/);
      if (m) {
        const hour = parseInt(m[1], 10);
        const min = parseInt(m[2], 10);
        const totalMin = hour * 60 + min;
        if (totalMin < 11 * 60) return 0;
        if (totalMin < 13 * 60 + 45) return 1;
        if (totalMin < 16 * 60 + 15) return 2;
        return 3;
      }
      return -1;
    };

    // 6. Map schedule for each QC user
    const teamSchedule = usersRes.rows.map(u => {
      const userPlanItems = planItemsRes.rows.filter(it => it.qc_id === u.id);
      const userLeads = leadsRes.rows.filter(l => isLeadMatchedToQc(l, u));

      // Build slot schedule
      const slots = standardSlots.map((s, idx) => {
        // Check if there's a plan item matching this slot or sequence
        const matchingPlanItem = userPlanItems.find(it => 
          (it.time_slot && it.time_slot.includes(s.slot.split(' ')[0])) || 
          it.sequence_order === (idx + 1)
        );

        // Check if there's an assigned lead matching this time/date
        const matchingLead = userLeads.find(l => {
          let timeStr = '';
          if (l.appointment_date) {
            const parts = l.appointment_date.split(' ');
            timeStr = parts.slice(1).join(' ');
          }
          if (!timeStr) {
            const fw = followupsRes.rows.find(f => f.lead_id === l.id && f.appointment_time);
            if (fw) timeStr = fw.appointment_time;
          }
          const matchedSlotIdx = getSlotIndexFromTimeStr(timeStr);
          return matchedSlotIdx === idx;
        });

        const isBooked = Boolean(matchingPlanItem || matchingLead);
        const bookedData = matchingPlanItem ? {
          title: matchingPlanItem.site_name,
          customerName: matchingPlanItem.customer_name,
          customerPhone: matchingPlanItem.customer_phone,
          siteAddress: matchingPlanItem.site_address,
          status: matchingPlanItem.status,
          leadId: matchingPlanItem.lead_id,
          projectId: matchingPlanItem.project_id
        } : (matchingLead ? {
          title: `นัดหมาย: ${matchingLead.customer_name}`,
          customerName: matchingLead.customer_name,
          customerPhone: matchingLead.customer_phone,
          siteAddress: matchingLead.customer_address,
          status: matchingLead.site_visit_approval_status === 'Approved' ? 'Confirmed' : 'Pending',
          leadId: matchingLead.id,
          appointmentType: matchingLead.appointment_type
        } : null);

        return {
          slot: s.slot,
          label: s.label,
          sequence: idx + 1,
          isBooked,
          booking: bookedData
        };
      });

      const bookedCount = slots.filter(s => s.isBooked).length;

      return {
        qcId: u.id,
        qcName: u.name,
        email: u.email,
        avatar: u.avatar,
        globalRole: u.global_role,
        department: u.department,
        assignedBranches: u.assigned_branches || [],
        serviceZones: u.service_zones || [],
        assignedZones: u.assigned_zones || [],
        homeAddress: u.home_address || '',
        phones: u.phones || [],
        totalBooked: bookedCount,
        totalSlots: standardSlots.length,
        isFullyBooked: bookedCount >= standardSlots.length,
        slots
      };
    });

    res.json({
      date: targetDate,
      totalQc: teamSchedule.length,
      teamSchedule
    });
  } catch (err) {
    console.error('Error fetching QC team schedule:', err);
    res.status(500).json({ error: 'Failed to fetch team schedule' });
  }
};

