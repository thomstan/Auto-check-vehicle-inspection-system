#AutoCheck - Vehicle Inspection Management System
A robust full-stack application built to manage vehicle inspection centers, track real-time inspection metrics, and monitor financial status.

##🚀 Features
Role-Based Access: Distinct portals for Admins and Inspection Centers.

Real-Time Analytics: Visualize pass/fail rates and daily/monthly counts.

Financial Tracking: Automated balance calculation based on inspection fees.

Secure Authentication: JWT-based login system.

##🛠 Tech Stack
Frontend: HTML5, TailwindCSS, Chart.js

Backend: Node.js, Express.js

Database: PostgreSQL

##📦 Installation & Setup
1. Clone the project
git clone https://github.com/thomstan/Auto-check-vehicle-inspection-system.git
cd Auto-check-vehicle-inspection-system
2. Install dependencies
npm install
3. Environment Variables
Create a .env file in the root directory and add your configuration (ensure this file is included in your .gitignore):

PORT=5000
DB_USER=your_username
DB_HOST=localhost
DB_NAME=inspection_db
DB_PASSWORD=your_password
DB_PORT=5432
JWT_SECRET=your_secret_key
4. Running the Application
Bash
node server.js
The application will be available at http://localhost:5000.

##🤝 Contributing
Contributions are welcome! Please feel free to submit a Pull Request.