const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { Parser } = require("json2csv");
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');

// ----- GET INSPECTIONS WITH FILTERS -----
router.get("/inspections", async (req, res) => {
  try {
    // 1. Destructure filters from query
    let { center_id, vehicle_type, fuel_type, result, start_date, end_date } = req.query;

    const params = [];
    let query = `
      SELECT i.id AS inspection_id, v.plate_number, v.vehicle_type, v.fuel_type, 
             v.chassis_number, v.engine_number, -- Added these new columns
             i.center_id, c.name AS center_name, i.result, i.inspection_date
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      JOIN centers c ON i.center_id = c.id
      WHERE 1=1
    `;

    // 2. Helper to build dynamic query
    if (center_id) {
      params.push(center_id);
      query += ` AND i.center_id = $${params.length}`;
    }

    // Use ILIKE for case-insensitive matching if the desktop app sends "Petrol" vs "petrol"
    if (vehicle_type && vehicle_type !== 'all') {
      params.push(vehicle_type);
      query += ` AND v.vehicle_type ILIKE $${params.length}`;
    }

    if (fuel_type && fuel_type !== 'all') {
      params.push(fuel_type);
      query += ` AND v.fuel_type ILIKE $${params.length}`;
    }

    if (result && result !== 'all') {
      params.push(result);
      query += ` AND i.result = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND i.inspection_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND i.inspection_date <= $${params.length}::date + interval '1 day'`;
    }

    query += " ORDER BY i.inspection_date DESC";

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Filter Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


router.get('/centers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Updated query to include fee_per_inspection for balance calculation
        const result = await db.query(
            "SELECT id, name, payment_status, payment_expiry, current_balance,fee_per_inspection FROM centers WHERE id = $1", 
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Center not found" });
        }
        
        // Use the controller's logic or send raw data
        const center = result.rows[0];

        // Ensure we calculate the balance so payment.html can see it
        const balanceQuery = await db.query(
            "SELECT COUNT(*) FROM inspections WHERE center_id = $1", 
            [id]
        );
        
        center.calculated_balance = parseInt(balanceQuery.rows[0].count) * (center.fee_per_inspection || 0);
        
        res.json(center);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error fetching center profile" });
    }
});
// ----- DOWNLOAD CSV WITH FILTERS -----
router.get("/inspections/download", async (req, res) => {
  try {
    let { center_id, vehicle_type, fuel_type, result,start_date, end_date } = req.query;

    const params = [];
    let count = 1;
    let query = `
      SELECT i.id AS inspection_id,
             v.plate_number,
             v.vehicle_type,
             v.fuel_type,
             i.center_id,
             c.name AS center_name,
             i.result,
             i.inspection_date
      FROM inspections i
      JOIN vehicles v ON i.vehicle_id = v.id
      JOIN centers c ON i.center_id = c.id
      WHERE 1=1
    `;

    if (center_id) {
      center_id = parseInt(center_id, 10);
      if (!isNaN(center_id)) {
        query += ` AND i.center_id = $${count}`;
        params.push(center_id);
        count++;
      }
    }
    if (vehicle_type) {
      query += ` AND v.vehicle_type = $${count}`;
      params.push(vehicle_type);
      count++;
    }
    if (fuel_type) {
      query += ` AND v.fuel_type = $${count}`;
      params.push(fuel_type);
      count++;
    }
    if (result) {
      query += ` AND i.result = $${count}`;
      params.push(result);
      count++;
    }

     if (start_date) {
      query += ` AND i.inspection_date >= $${count}`;
      params.push(start_date);
      count++;
    }

    if (end_date) {
      // We add '23:59:59' to include the full end day
      query += ` AND i.inspection_date <= $${count}::date + interval '1 day'`;
      params.push(end_date);
      count++;
    }

    query += " ORDER BY i.inspection_date DESC";

    const { rows } = await db.query(query, params);

    if (!rows.length) {
      return res.status(200).send("No inspection data found for selected filters.");
    }

    // Convert inspection_date to string for CSV
    const cleanedRows = rows.map(r => ({
      ...r,
      inspection_date: r.inspection_date ? r.inspection_date.toISOString() : ""
    }));

    const parser = new Parser();
    const csv = parser.parse(cleanedRows);

    res.header("Content-Type", "text/csv");
    res.attachment("inspection_report.csv");
    res.send(csv);

  } catch (err) {
    console.error("CSV download error:", err);
    res.status(500).send("Server error generating CSV");
  }
});

module.exports = router;