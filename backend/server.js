const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TABLEAU_SECRET = process.env.TABLEAU_SECRET || 'tableau-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Mock user database (in production, use a real database)
const users = [
  {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('password', 8)
  }
];

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
l 
  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({ token });
});

// Verify token endpoint
app.get('/api/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Tableau JWT token endpoint - supports multiple workbooks
app.get('/api/tableau-token', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { workbook, view } = req.query; // Allow dynamic workbook and view selection

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Create Tableau-specific JWT for embedded views
    const tableauPayload = {
      iss: process.env.TABLEAU_SERVER_URL || 'http://103.154.174.60/', // Updated to provided Tableau Server with trailing slash
      sub: decoded.username,
      aud: 'tableau',
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      jti: Math.random().toString(36).substring(7),
      scp: ['tableau:views:embed', 'tableau:views:download', 'tableau:views:export'],
      // Add specific site and content restrictions if needed
      'https://tableau.com/oda': {
        site: process.env.TABLEAU_SITE || 'korlantas', // Updated to provided site
        content: {
          workbook: workbook || process.env.TABLEAU_WORKBOOK || 'YourWorkbook',
          view: view || process.env.TABLEAU_VIEW || 'YourDashboard'
        }
      }
    };

    const tableauToken = jwt.sign(tableauPayload, TABLEAU_SECRET);

    res.json({
      tableauToken,
      serverUrl: process.env.TABLEAU_SERVER_URL || 'http://103.154.174.60/',
      site: process.env.TABLEAU_SITE || 'korlantas',
      workbook: workbook || process.env.TABLEAU_WORKBOOK || 'YourWorkbook',
      view: view || process.env.TABLEAU_VIEW || 'YourDashboard'
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get available workbooks endpoint - using mock data for now
app.get('/api/workbooks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    jwt.verify(token, JWT_SECRET);

    const workbooks = [
      {
        id: 'sales-dashboard',
        name: 'Sales Dashboard',
        workbook: 'SalesWorkbook',
        view: 'SalesOverview',
        description: 'Comprehensive sales analytics and performance metrics'
      },
      {
        id: 'inventory-management',
        name: 'Inventory Management',
        workbook: 'InventoryWorkbook',
        view: 'InventoryDashboard',
        description: 'Real-time inventory tracking and management insights'
      },
      {
        id: 'customer-analytics',
        name: 'Customer Analytics',
        workbook: 'CustomerWorkbook',
        view: 'CustomerInsights',
        description: 'Customer behavior analysis and segmentation'
      },
      {
        id: 'financial-reports',
        name: 'Financial Reports',
        workbook: 'FinanceWorkbook',
        view: 'FinancialSummary',
        description: 'Financial performance and budget analysis'
      }
    ];
    res.json({ workbooks });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'mock-mode', mode: 'standalone' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Tableau Server: ${process.env.TABLEAU_SERVER_URL || 'http://103.154.174.60/'}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
