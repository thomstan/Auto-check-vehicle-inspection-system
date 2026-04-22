const express = require("express");
const cors = require("cors");
const db = require("./backend/config/db");
const authRoutes = require("./backend/routes/authRoutes");
const inspectionRoutes = require("./backend/routes/inspectionRoutes");
const dashboardRoutes = require("./backend/routes/dashboardRoutes");
const adminRoutes = require("./backend/routes/adminRoutes");
const paymentRoutes = require('./backend/routes/paymentRoutes');
require('dotenv').config();




const app = express();

app.use(cors());
app.use(express.json()); 
app.use(express.static('public'));

// Routes
app.use("/api/admin", adminRoutes);
app.use("/api", authRoutes);
app.use("/api", inspectionRoutes);
app.use("/api/dashboard", dashboardRoutes);
console.log('Payment Routes:', paymentRoutes);
console.log('Inspection Routes:', inspectionRoutes); 
app.use("/api/payments", paymentRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
});