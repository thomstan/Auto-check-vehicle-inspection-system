const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.post("/inspection", async (req, res) => {
  const { plate_number, vehicle_type, fuel_type, chassis_number, engine_number, center_id, result } = req.body;

  if (!center_id) return res.status(400).json({ message: "Center ID is required" });

  try {
    // 1. Check if center is allowed to work (Post-Pay Check)
    const centerCheck = await db.query(
      "SELECT payment_status, payment_expiry, fee_per_inspection FROM centers WHERE id = $1",
      [center_id]
    );

    if (centerCheck.rows.length === 0) return res.status(404).json({ message: "Center not found" });

    const center = centerCheck.rows[0];
    const today = new Date();

    // Block if status is false OR if the expiry date for last month's payment has passed
    if (!center.payment_status || (center.payment_expiry && today > new Date(center.payment_expiry))) {
      return res.status(403).json({ 
        message: "Access Denied: Please settle your previous monthly invoice to continue." 
      });
    }

    // 2. Insert vehicle data
    const vehicle = await db.query(
      `INSERT INTO vehicles (plate_number, vehicle_type, fuel_type, chassis_number, engine_number) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (plate_number) DO UPDATE SET 
          vehicle_type = EXCLUDED.vehicle_type,
          chassis_number = EXCLUDED.chassis_number,
          engine_number = EXCLUDED.engine_number
       RETURNING id`,
      [plate_number, vehicle_type, fuel_type, chassis_number, engine_number]
    );
    const vehicleId = vehicle.rows[0].id;

    // 3. Insert inspection record
    await db.query(
      "INSERT INTO inspections (vehicle_id, center_id, result) VALUES ($1,$2,$3)",
      [vehicleId, center_id, result]
    );

    // 4. REAL-TIME UPDATE: Increment the center's current balance
    await db.query(
      "UPDATE centers SET current_balance = current_balance + $1 WHERE id = $2",
      [center.fee_per_inspection, center_id]
    );

    res.json({ message: "Inspection saved. Monthly balance updated." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;