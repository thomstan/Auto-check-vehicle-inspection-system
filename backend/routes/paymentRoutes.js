
const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post("/process-payment", async (req, res) => {
    const { center_id, amount_paid, billing_start, billing_end } = req.body;

    try {
        await db.query('BEGIN'); // Start transaction

        // 1. Record the history in the payments table
        await db.query(
            `INSERT INTO payments (center_id, amount_paid, billing_period_start, billing_period_end) 
             VALUES ($1, $2, $3, $4)`,
            [center_id, amount_paid, billing_start, billing_end]
        );

        // 2. Reset the current balance and update the expiry date for the next month
        // We set payment_status to true to unblock the center
        await db.query(
            `UPDATE centers 
             SET current_balance = 0, 
                 payment_status = true, 
                 payment_expiry = CURRENT_DATE + INTERVAL '1 month' 
             WHERE id = $1`,
            [center_id]
        );

        await db.query('COMMIT');
        res.json({ message: "Payment processed and history saved." });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Payment failed to process." });
    }
});
// Get payment history for a specific center
router.get("/payment-history/:center_id", async (req, res) => {
    try {
        const { center_id } = req.params;
        const result = await db.query(
            "SELECT * FROM payments WHERE center_id = $1 ORDER BY payment_date DESC",
            [center_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Could not fetch payment history." });
    }
});
module.exports = router;