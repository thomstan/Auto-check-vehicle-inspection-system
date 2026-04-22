const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { username, password } = req.body;
    
    // --- DEBUG LOGS START ---
    console.log("--- Login Attempt ---");
    console.log("Username provided:", username);
    // --- DEBUG LOGS END ---

    try {
        // Search by username
        const result = await db.query("SELECT * FROM centers WHERE username = $1", [username]);
        const user = result.rows[0];

        // --- DEBUG LOGS ---
       

        console.log("Result: Login Successful!");

        const token = jwt.sign(
            { id: user.id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        // We include center_id so the frontend can redirect properly
        res.json({ 
            token, 
            role: user.role, 
            center_id: user.id 
        });

    } catch (err) {
        console.error("Database/Server Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 1. Get Global Stats
exports.getStats = async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM centers) as total_centers,
                (SELECT COUNT(*) FROM inspections) as total_inspections,
                (SELECT SUM(current_balance) FROM centers) as total_receivable
                
            FROM centers LIMIT 1
        `);
        res.json(stats.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Error fetching system stats" });
    }
};

// 2. Get All Centers
exports.getAllCenters = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.*, 
                -- Daily Inspection Count
                (SELECT COUNT(*) FROM inspections WHERE center_id = c.id AND DATE(inspection_date) = CURRENT_DATE) as daily_count,
                -- Monthly Inspection Count
                (SELECT COUNT(*) FROM inspections WHERE center_id = c.id AND date_trunc('month', inspection_date) = date_trunc('month', CURRENT_DATE)) as monthly_count,
                -- Calculated Balance (Count * Fee)
                ((SELECT COUNT(*) FROM inspections WHERE center_id = c.id) * c.fee_per_inspection) as total_balance
            FROM centers c 
            ORDER BY c.name ASC`;
        
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: "Error fetching centers with statistics" });
    }
};

// 3. Create New Center
exports.createNewCenter = async (req, res) => {
    const { name, location, username, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);
        
        await db.query(
            "INSERT INTO centers (name, location, username, password, role, payment_status, payment_expiry) VALUES ($1, $2, $3, $4, 'center', true, CURRENT_DATE + INTERVAL '1 month')",
            [name, location, username, hashedPass]
        );
        res.json({ message: "New center created successfully" });
    } catch (err) {
        res.status(500).json({ message: "Error creating center" });
    }
};

// adminController.js

// Reset balance to 0 when Admin approves payment
// adminController.js
exports.approvePayment = async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ message: "Request body is missing" });
    }
    const { center_id, amount_paid, billing_start, billing_end } = req.body;
    if (!center_id) {
        return res.status(400).json({ message: "center_id is required" });
    }

    try {
        await db.query('BEGIN'); // Start the Transaction

        // 1. SAVE THE HISTORY (The missing piece!)
        await db.query(
            `INSERT INTO payments (center_id, amount_paid, billing_period_start, billing_period_end, payment_date) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [center_id, amount_paid, billing_start, billing_end]
        );

        // 2. RESET THE BALANCE AND REACTIVATE
        await db.query(
            `UPDATE centers 
             SET current_balance = 0, 
                 payment_status = true, 
                 payment_expiry = CURRENT_DATE + INTERVAL '1 month' 
             WHERE id = $1`,
            [center_id]
        );

        await db.query('COMMIT'); // Commit both changes
        res.json({ message: "Balance reset and history saved." });
        
    } catch (err) {
        await db.query('ROLLBACK'); // Undo everything if it fails
        console.error("Payment Approval Error:", err);
        res.status(500).json({ error: "Could not approve payment." });
    }
};

// Admin updates the fee per inspection for a center
exports.updateFee = async (req, res) => {
    const { id } = req.params;
    const { fee_per_inspection } = req.body;
    try {
        await db.query(
            "UPDATE centers SET fee_per_inspection = $1 WHERE id = $2",
            [fee_per_inspection, id]
        );
        res.json({ message: "Inspection fee updated successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// 4. Get Global Inspections
exports.getGlobalInspections = async (req, res) => {
    try {
        const query = `
            SELECT i.id, i.inspection_date, i.result, v.plate_number, v.fuel_type, c.name as center_name
            FROM inspections i
            JOIN vehicles v ON i.vehicle_id = v.id
            JOIN centers c ON i.center_id = c.id
            ORDER BY i.inspection_date DESC;
        `;
        const { rows } = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
    }
};


// ... existing login, getStats, getAllCenters, createNewCenter, approvePayment ...

// 5. UPDATE Center (Username, Password, Name, Suspension)
exports.updateCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, username, password, payment_status } = req.body;

        let query;
        let params;

        // Only update password if a new one is provided
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            query = "UPDATE centers SET name = $1, username = $2, payment_status = $3, password = $4 WHERE id = $5";
            params = [name, username, payment_status, hashedPassword, id];
        } else {
            query = "UPDATE centers SET name = $1, username = $2, payment_status = $3 WHERE id = $4";
            params = [name, username, payment_status, id];
        }

        const result = await db.query(query, params);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Center not found" });
        }

        res.json({ message: "Center updated successfully" });
    } catch (err) {
        console.error("Update Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// 6. DELETE Center
exports.deleteCenter = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query("DELETE FROM centers WHERE id = $1", [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Center not found" });
        }
        
        res.json({ message: "Center deleted permanently" });
    } catch (err) {
        console.error("Delete Error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// balance calculation for centers that is displayed at centers payment page
// adminController.js

// balance calculation for centers displayed at payment page
exports.getCenterProfile = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT 
                id, name, payment_status, payment_expiry, fee_per_inspection,
                -- Use COALESCE to ensure we don't return NULL for balance
                COALESCE((SELECT COUNT(*) FROM inspections WHERE center_id = centers.id) * fee_per_inspection, 0) as calculated_balance
            FROM centers 
            WHERE id = $1`;
        
        const result = await db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Center not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error("Profile Fetch Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};