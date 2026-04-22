const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(403).json({ message: "Access Denied: No Token Provided" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified; // Contains { id, role }
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or Expired Token" });
    }
};

const authorizeRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: `Forbidden: Requires ${role} role` });
        }
        next();
    };
};

module.exports = { verifyToken, authorizeRole };