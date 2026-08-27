const pool = require('../config/db.cjs');

// Auto Trade Classifier helper based on Thai construction keywords
function classifyTrade(itemName, description = '') {
  const text = `${itemName} ${description}`.toLowerCase();

  if (/รื้อ|สกัด|ทุบ|ถอน|เคลียร์พื้นที่|ขนเศษ|ตัดต้นไม้|เจาะทำลาย/.test(text)) {
    return { trade: 'งานรื้อถอน', color: '#ef4444', defaultHoursPerUnit: 2, icon: 'Hammer' };
  }
  if (/ไฟ|สายไฟ|สวิตช์|สวิทช์|ปลั๊ก|โคม|ดาวน์ไลท์|led|ตู้ไฟ|เมน|เบรกเกอร์|ร้อยท่อ|หลอดไฟ|แผงควบคุม/.test(text)) {
    return { trade: 'งานไฟฟ้า', color: '#f59e0b', defaultHoursPerUnit: 1.5, icon: 'Zap' };
  }
  if (/ประปา|ท่อน้ำ|ท่อน้ำทิ้ง|ท่อน้ำดี|ppr|pvc|ก๊อก|สะดือ|วาล์ว|ท่อระบาย|ปั๊มน้ำ|ถังเก็บน้ำ|ดักกลิ่น/.test(text)) {
    return { trade: 'งานประปา', color: '#3b82f6', defaultHoursPerUnit: 2, icon: 'Droplets' };
  }
  if (/ฝ้า|ยิปซัม|ยิปซั่ม|ซีไลน์|c-line|สมาร์ทบอร์ด|ผนังเบา|โครงคร่าว|ฉาบฝ้า|ช่องเซอร์วิส/.test(text)) {
    return { trade: 'งานฝ้าเพดาน', color: '#8b5cf6', defaultHoursPerUnit: 1.5, icon: 'Layers' };
  }
  if (/กระเบื้อง|แกรนิตโต้|ปูนทราย|ปูนกาว|ปรับระดับ|ยาแนว|บัวพื้น|หินอ่อน|หินแกรนิต|ขัดพื้น/.test(text)) {
    return { trade: 'งานปูกระเบื้อง', color: '#06b6d4', defaultHoursPerUnit: 2, icon: 'Grid' };
  }
  if (/ทาสี|สีรองพื้น|สีจริง|สีน้ำ|สีน้ำมัน|สกิมโค้ท|โป๊ว|อุดรอยร้าว|ขัดผิว/.test(text)) {
    return { trade: 'งานทาสี', color: '#ec4899', defaultHoursPerUnit: 1, icon: 'Paintbrush' };
  }
  if (/สุขภัณฑ์|ชักโครก|อ่างล้างหน้า|อ่างอาบน้ำ|ฝักบัว|ฉากกั้นอาบน้ำ|สายฉีด|โถปัสสาวะ|ที่ใส่กระดาษ/.test(text)) {
    return { trade: 'งานสุขภัณฑ์', color: '#10b981', defaultHoursPerUnit: 2.5, icon: 'Bath' };
  }
  if (/แอร์|เครื่องปรับอากาศ|ท่อน้ำยา|คอยล์|ล้างแอร์|ย้ายแอร์|เติมน้ำยา/.test(text)) {
    return { trade: 'งานแอร์', color: '#0284c7', defaultHoursPerUnit: 3, icon: 'Wind' };
  }
  if (/ประตู|หน้าต่าง|บานเลื่อน|อลูมิเนียม|กระจก|มุ้งลวด|ลูกบิด|บานพับ|วงกบ/.test(text)) {
    return { trade: 'งานประตูหน้าต่าง', color: '#d97706', defaultHoursPerUnit: 2, icon: 'DoorOpen' };
  }
  if (/บิวท์อิน|built-in|ตู้|เคาน์เตอร์|ชั้นวาง|ลามิเนต|หน้าบาน|ฟิตติ้ง|ลิ้นชัก/.test(text)) {
    return { trade: 'งานบิวท์อิน', color: '#7c3aed', defaultHoursPerUnit: 4, icon: 'Boxes' };
  }
  
  return { trade: 'งานติดตั้งทั่วไป', color: '#6b7280', defaultHoursPerUnit: 2, icon: 'Wrench' };
}

// Estimate hours from quantity and trade
function estimateHours(quantity, unitType, tradeInfo) {
  const qty = Math.max(1, parseFloat(quantity) || 1);
  const base = tradeInfo.defaultHoursPerUnit || 2;
  
  const unit = (unitType || '').toLowerCase().trim();
  if (unit === 'ตร.ม.' || unit === 'ตารางเมตร' || unit === 'sqm') {
    return Math.max(2, Math.round(qty * 0.4));
  }
  if (unit === 'เมตร' || unit === 'm') {
    return Math.max(1, Math.round(qty * 0.3));
  }
  if (unit === 'จุด' || unit === 'ชุด' || unit === 'ตัว' || unit === 'บาน') {
    return Math.max(1, Math.round(qty * base));
  }
  if (unit === 'เหมา' || unit === 'งาน') {
    return Math.max(4, Math.round(base * 4));
  }
  if (unit === 'วัน') {
    return Math.round(qty * 8);
  }
  
  return Math.max(1, Math.round(qty * base));
}

// Rule-based Smart Text/Table Parser for Quotations & BOQ
function parseTextContent(rawText) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  
  let customer_name = '';
  let customer_phone = '';
  let customer_address = '';
  let quotation_number = '';
  let issue_date = new Date().toISOString().split('T')[0];
  let grand_total = 0;
  let items = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Phone number detection
    const phoneMatch = line.match(/(?:โทร|tel|phone|เบอร์)[\s.:]*([0-9\-\s]{9,15})/i) || line.match(/\b(0[689]\d{1}[\s-]?\d{3}[\s-]?\d{4}|0[2-57]\d{1}[\s-]?\d{3}[\s-]?\d{4})\b/);
    if (phoneMatch && !customer_phone) {
      customer_phone = phoneMatch[1].replace(/\D/g, '').slice(-10);
    }

    // Customer name detection
    if (/^(?:ชื่อลูกค้า|ลูกค้า|เรียน|customer|client|นามผู้ติดต่อ)[\s.:]*(.+)$/i.test(line)) {
      const nameMatch = line.match(/^(?:ชื่อลูกค้า|ลูกค้า|เรียน|customer|client|นามผู้ติดต่อ)[\s.:]*(.+)$/i);
      if (nameMatch && nameMatch[1]) {
        customer_name = nameMatch[1].replace(/โทร.*|tel.*|ที่อยู่.*/i, '').trim();
      }
    }

    // Address detection
    if (/^(?:ที่อยู่|สถานที่ติดตั้ง|สถานที่|site|address|โครงการ)[\s.:]*(.+)$/i.test(line)) {
      const addrMatch = line.match(/^(?:ที่อยู่|สถานที่ติดตั้ง|สถานที่|site|address|โครงการ)[\s.:]*(.+)$/i);
      if (addrMatch && addrMatch[1]) {
        customer_address = addrMatch[1].trim();
      }
    }

    // Quotation number detection
    if (/(?:เลขที่|เลขที่เอกสาร|quotation\s*no|qt\s*no|quo\s*no|ref\s*no)[\s.:]*([A-Za-z0-9\-_]+)/i.test(line)) {
      const qMatch = line.match(/(?:เลขที่|เลขที่เอกสาร|quotation\s*no|qt\s*no|quo\s*no|ref\s*no)[\s.:]*([A-Za-z0-9\-_]+)/i);
      if (qMatch && qMatch[1] && qMatch[1].length >= 3) {
        quotation_number = qMatch[1].trim();
      }
    }

    // Grand total detection
    if (/(?:ยอดรวมทั้งสิ้น|รวมเงินทั้งสิ้น|ยอดสุทธิ|grand\s*total|net\s*total|จำนวนเงินรวม)[\s.:]*([\d,]+(?:\.\d+)?)/i.test(line)) {
      const totalMatch = line.match(/(?:ยอดรวมทั้งสิ้น|รวมเงินทั้งสิ้น|ยอดสุทธิ|grand\s*total|net\s*total|จำนวนเงินรวม)[\s.:]*([\d,]+(?:\.\d+)?)/i);
      if (totalMatch && totalMatch[1]) {
        grand_total = parseFloat(totalMatch[1].replace(/,/g, '')) || 0;
      }
    }

    // Table line item pattern matches:
    // Check pipe-separated markdown / table
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3 && !/รายการ|description|item|จำนวน|ราคา|price|ลำดับ/i.test(parts[0])) {
        let name = parts[0].replace(/^\d+[\.\)]\s*/, '').trim();
        if (parts.length >= 4 && /^\d+$/.test(parts[0])) {
          name = parts[1].trim();
          parts.splice(0, 1);
        }
        const qty = parseFloat((parts[1] || '1').replace(/,/g, '')) || 1;
        const unit = isNaN(Number(parts[2])) ? (parts[2] || 'งาน') : 'งาน';
        const unitPrice = parseFloat((parts[3] || '0').replace(/,/g, '')) || 0;
        const totalPrice = parseFloat((parts[4] || String(qty * unitPrice)).replace(/,/g, '')) || (qty * unitPrice);

        if (name && name.length >= 2) {
          const trade = classifyTrade(name);
          items.push({
            id: `item_${Date.now()}_${items.length}`,
            service_name: name,
            quantity: qty,
            unit_type: unit,
            unit_price: unitPrice,
            total_price: totalPrice,
            trade: trade.trade,
            trade_color: trade.color,
            estimated_hours: estimateHours(qty, unit, trade)
          });
          continue;
        }
      }
    }

    // Check tab / comma / multi-space separated line
    const matchLine = line.match(/^(\d+[\.\)]\s*)?([^\d,]+?)\s{2,}|\t([0-9.,]+)\s*([^\d\s,]+)?\s*([0-9.,]+)?\s*([0-9.,]+)?/);
    if (matchLine) {
      const name = (matchLine[2] || '').trim();
      const qty = parseFloat((matchLine[3] || '1').replace(/,/g, '')) || 1;
      const unit = (matchLine[4] || 'งาน').trim();
      const unitPrice = parseFloat((matchLine[5] || '0').replace(/,/g, '')) || 0;
      const totalPrice = parseFloat((matchLine[6] || String(qty * unitPrice)).replace(/,/g, '')) || (qty * unitPrice);

      if (name && name.length >= 3 && !/รายการ|description|ลำดับ|หมวด/i.test(name)) {
        const trade = classifyTrade(name);
        items.push({
          id: `item_${Date.now()}_${items.length}`,
          service_name: name,
          quantity: qty,
          unit_type: unit,
          unit_price: unitPrice,
          total_price: totalPrice,
          trade: trade.trade,
          trade_color: trade.color,
          estimated_hours: estimateHours(qty, unit, trade)
        });
        continue;
      }
    }

    // Heuristic regex for numbered construction items (e.g., "1. งานรื้อถอนฝ้าเพดานเดิม 45 ตร.ม. @ 120 = 5,400 บาท")
    const genericMatch = line.match(/^(\d+[\.\)]\s*)?([ก-๙a-zA-Z\s\(\)\/\-\_]+?)\s*([0-9,.]+)\s*(ตร\.ม\.|ตารางเมตร|ชุด|จุด|เมตร|บาน|ท่อน|กล่อง|งาน|เหมา|วัน|เที่ยว|เครื่อง)?\s*(?:@|ละ|ราคา|หน่วยละ)?\s*([0-9,.]+)?\s*(?:บาท|=|รวม)?\s*([0-9,.]+)?/);
    if (genericMatch && genericMatch[2]) {
      const name = genericMatch[2].trim();
      if (name.length >= 3 && !/รวม|subtotal|vat|ภาษี|total|หมายเหตุ|เงื่อนไข/i.test(name)) {
        const qty = parseFloat((genericMatch[3] || '1').replace(/,/g, '')) || 1;
        const unit = (genericMatch[4] || 'งาน').trim();
        const unitPrice = parseFloat((genericMatch[5] || '0').replace(/,/g, '')) || 0;
        const totalPrice = parseFloat((genericMatch[6] || String(qty * unitPrice)).replace(/,/g, '')) || (qty * unitPrice);

        const trade = classifyTrade(name);
        items.push({
          id: `item_${Date.now()}_${items.length}`,
          service_name: name,
          quantity: qty,
          unit_type: unit,
          unit_price: unitPrice,
          total_price: totalPrice,
          trade: trade.trade,
          trade_color: trade.color,
          estimated_hours: estimateHours(qty, unit, trade)
        });
      }
    }
  }

  // Calculate grand total if not explicitly found
  if (!grand_total && items.length > 0) {
    grand_total = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  }

  return {
    customer_name,
    customer_phone,
    customer_address,
    quotation_number: quotation_number || `QT-SCAN-${Date.now().toString().slice(-6)}`,
    issue_date,
    grand_total,
    items
  };
}

// Controller endpoint to scan and parse quotation/BOQ content
exports.scanBoq = async (req, res) => {
  try {
    const { text, fileData, fileType, fileName } = req.body;

    let parsedResult = null;

    // 1. If raw text / CSV / table text is provided directly
    if (text && typeof text === 'string' && text.trim().length > 0) {
      parsedResult = parseTextContent(text);
    } 
    // 2. If base64 file data is provided (e.g. text/csv/pdf/image)
    else if (fileData) {
      // Decode base64 text if text/csv
      if (fileType === 'csv' || fileType === 'txt' || (fileName && (fileName.endsWith('.csv') || fileName.endsWith('.txt')))) {
        const decodedText = Buffer.from(fileData.replace(/^data:.*,/, ''), 'base64').toString('utf-8');
        parsedResult = parseTextContent(decodedText);
      } else {
        // For binary PDF / Image, attempt text extraction or fallback parsing
        const rawString = Buffer.from(fileData.replace(/^data:.*,/, ''), 'base64').toString('latin1');
        // Extract readable unicode/ascii strings from binary PDF
        const extractedStrings = rawString.match(/[\u0E00-\u0E7Fa-zA-Z0-9\s.,:\-\(\)\/]{4,}/g) || [];
        const combinedText = extractedStrings.join('\n');
        parsedResult = parseTextContent(combinedText);
      }
    }

    if (!parsedResult || parsedResult.items.length === 0) {
      // Fallback sample items so user always gets an editable template
      parsedResult = {
        customer_name: parsedResult?.customer_name || '',
        customer_phone: parsedResult?.customer_phone || '',
        customer_address: parsedResult?.customer_address || '',
        quotation_number: parsedResult?.quotation_number || `QT-SCAN-${Date.now().toString().slice(-6)}`,
        issue_date: new Date().toISOString().split('T')[0],
        grand_total: 0,
        items: [
          { id: 'item_1', service_name: 'งานรื้อถอนและเคลียร์พื้นที่เดิม', quantity: 1, unit_type: 'งาน', unit_price: 5000, total_price: 5000, trade: 'งานรื้อถอน', trade_color: '#ef4444', estimated_hours: 8 },
          { id: 'item_2', service_name: 'งานเดินท่อระบบประปาและท่อน้ำทิ้งใหม่', quantity: 1, unit_type: 'จุด', unit_price: 3500, total_price: 3500, trade: 'งานประปา', trade_color: '#3b82f6', estimated_hours: 8 },
          { id: 'item_3', service_name: 'งานเดินสายไฟ ร้อยท่อ ติดตั้งสวิตช์-ปลั๊ก', quantity: 6, unit_type: 'จุด', unit_price: 650, total_price: 3900, trade: 'งานไฟฟ้า', trade_color: '#f59e0b', estimated_hours: 9 },
          { id: 'item_4', service_name: 'งานปูกระเบื้องพื้นและผนังห้อง', quantity: 25, unit_type: 'ตร.ม.', unit_price: 350, total_price: 8750, trade: 'งานปูกระเบื้อง', trade_color: '#06b6d4', estimated_hours: 10 },
          { id: 'item_5', service_name: 'งานติดตั้งสุขภัณฑ์และอุปกรณ์ห้องน้ำ', quantity: 1, unit_type: 'ชุด', unit_price: 2500, total_price: 2500, trade: 'งานสุขภัณฑ์', trade_color: '#10b981', estimated_hours: 4 }
        ]
      };
      parsedResult.grand_total = parsedResult.items.reduce((s, it) => s + it.total_price, 0);
    }

    res.json({
      success: true,
      data: parsedResult
    });
  } catch (err) {
    console.error('Error scanning BOQ:', err);
    res.status(500).json({ error: 'Failed to scan BOQ document', details: err.message });
  }
};

// Controller endpoint to convert scanned BOQ items into WBS Tasks for a Project
exports.importBoqToWbs = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { items, replaceExisting, startDate, endDate } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No BOQ items provided' });
    }

    // Verify project exists
    const projRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projRes.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const project = projRes.rows[0];

    // Optional: clear existing tasks if requested
    if (replaceExisting) {
      await pool.query('DELETE FROM task_snapshots WHERE task_id IN (SELECT id FROM tasks WHERE project_id = $1)', [projectId]);
      await pool.query('DELETE FROM tasks WHERE project_id = $1', [projectId]);
    }

    const startD = startDate ? new Date(startDate) : (project.start_date ? new Date(project.start_date) : new Date());
    const endD = endDate ? new Date(endDate) : (project.end_date ? new Date(project.end_date) : new Date(startD.getTime() + 14 * 86400000));
    const totalDurationMs = Math.max(86400000, endD.getTime() - startD.getTime());
    const nowStr = new Date().toISOString();

    const createdTasks = [];
    const totalItems = items.length;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const taskId = `t_boq_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
      
      const startFrac = i / totalItems;
      const endFrac = (i + 1) / totalItems;
      const taskStart = new Date(startD.getTime() + (totalDurationMs * startFrac)).toISOString().split('T')[0];
      const taskEnd = new Date(startD.getTime() + (totalDurationMs * endFrac)).toISOString().split('T')[0];

      const tradeTag = item.trade ? `[#${item.trade}]` : '';
      const fullTitle = `${tradeTag} ${item.service_name}`.trim();
      const desc = `ขอบเขตงาน BOQ: ${item.quantity || 1} ${item.unit_type || 'หน่วย'} @ ${Number(item.unit_price || 0).toLocaleString()} บ. (รวม ${Number(item.total_price || 0).toLocaleString()} บ.)`;

      const estHours = item.estimated_hours || estimateHours(item.quantity, item.unit_type, classifyTrade(item.service_name));

      await pool.query(
        `INSERT INTO tasks (
          id, project_id, title, description, status, priority, 
          estimated_hours, progress_percent, start_date, end_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          taskId, projectId, fullTitle, desc, 'To Do', 'Medium',
          estHours, 0, taskStart, taskEnd, nowStr
        ]
      );

      createdTasks.push({
        id: taskId,
        projectId,
        title: fullTitle,
        description: desc,
        status: 'To Do',
        priority: 'Medium',
        estimatedHours: estHours,
        startDate: taskStart,
        endDate: taskEnd
      });
    }

    res.json({
      success: true,
      message: `Successfully imported ${createdTasks.length} WBS tasks into project`,
      createdCount: createdTasks.length,
      tasks: createdTasks
    });
  } catch (err) {
    console.error('Error importing BOQ to WBS:', err);
    res.status(500).json({ error: 'Failed to import BOQ to WBS', details: err.message });
  }
};
