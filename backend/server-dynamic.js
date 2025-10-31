const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const axios = require('axios');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TABLEAU_SECRET = process.env.TABLEAU_SECRET || 'tableau-secret-key';

// Tableau Server configuration
const TABLEAU_SERVER = process.env.TABLEAU_SERVER_URL || 'https://103.154.174.60';
const TABLEAU_USERNAME = process.env.TABLEAU_USERNAME || 'korlantas';
const TABLEAU_PASSWORD = process.env.TABLEAU_PASSWORD || '4ministrator!';

// Create axios instance with proper SSL configuration
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // For self-signed certificates
  }),
  timeout: 30000
});

// Global variable to store workbooks cache
let workbooksCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to authenticate with Tableau Server
async function authenticateTableau() {
  try {
    const signInUrl = `${TABLEAU_SERVER}/api/3.21/auth/signin`;
    const signInPayload = {
      credentials: {
        name: TABLEAU_USERNAME,
        password: TABLEAU_PASSWORD,
        site: {
          contentUrl: ''
        }
      }
    };

    console.log('Authenticating with Tableau Server...');
    console.log('Server URL:', TABLEAU_SERVER);
    console.log('Username:', TABLEAU_USERNAME);

    const response = await axiosInstance.post(signInUrl, signInPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Authentication successful');
    return {
      token: response.data.credentials.token,
      siteId: response.data.credentials.site.id
    };
  } catch (error) {
    console.error('Tableau authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

// Function to fetch workbooks from Tableau Server
async function fetchTableauWorkbooks() {
  try {
    // Check cache first
    if (workbooksCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached workbooks');
      return workbooksCache;
    }

    console.log('Fetching fresh workbooks from Tableau Server...');

    const { token, siteId } = await authenticateTableau();

    const workbooksUrl = `${TABLEAU_SERVER}/api/3.21/sites/${siteId}/workbooks`;
    const response = await axiosInstance.get(workbooksUrl, {
      headers: {
        'X-Tableau-Auth': token,
        'Accept': 'application/json'
      }
    });

    const tableauWorkbooks = response.data.workbooks.workbook;

    // Transform to our format
    const workbooks = tableauWorkbooks.map(workbook => ({
      id: workbook.id,
      name: workbook.name,
      workbook: workbook.contentUrl,
      view: workbook.name.includes('Home') ? 'Home' : workbook.name.includes('Dashboard') ? 'Dashboard' : 'Dashboard', // Dynamic view name
      description: workbook.description || `Workbook ${workbook.name}`,
      owner: workbook.owner.name,
      createdAt: workbook.createdAt,
      updatedAt: workbook.updatedAt,
      size: workbook.size,
      tags: workbook.tags?.tag?.map(tag => tag.label) || []
    }));

    // Cache the results
    workbooksCache = workbooks;
    cacheTimestamp = Date.now();

    console.log(`Fetched ${workbooks.length} workbooks from Tableau Server`);
    return workbooks;

  } catch (error) {
    console.error('Failed to fetch workbooks from Tableau:', error.response?.data || error.message);

    // Fallback to mock data if Tableau is unavailable
    console.log('Falling back to mock workbooks data');
    return getMockWorkbooks();
  }
}

// Fallback mock workbooks
function getMockWorkbooks() {
  return [
    {
      id: 'dashboard-sebaran-pelanggaran',
      name: 'Dashboard Sebaran Pelanggaran',
      workbook: 'DashboardSebaranPelanggaran',
      view: 'Dashboard',
      description: 'Dashboard untuk melihat sebaran pelanggaran lalu lintas'
    },
    {
      id: 'dashboard-summary-dakgar',
      name: 'Dashboard Summary Dakgar',
      workbook: 'DashboardSummaryDakgar',
      view: 'Summary',
      description: 'Ringkasan data DAKGAR LANTAS'
    },
    {
      id: 'korlantas-trend-pelanggaran',
      name: 'Korlantas Trend Pelanggaran',
      workbook: 'KorlantasTrendPelanggaran',
      view: 'Trend',
      description: 'Trend pelanggaran lalu lintas Korlantas'
    },
    {
      id: 'dashboard-demografi-pelanggaran',
      name: 'Dashboard Demografi Pelanggaran',
      workbook: 'DashboardDemografiPelanggaran',
      view: 'Demografi',
      description: 'Analisis demografi pelanggar lalu lintas'
    },
    {
      id: 'dashboard-denda',
      name: 'Dashboard Denda',
      workbook: 'DashboardDenda',
      view: 'Denda',
      description: 'Dashboard monitoring denda tilang'
    },
    {
      id: 'dashboard-blangko-e-tilang',
      name: 'Dashboard Blangko E-Tilang',
      workbook: 'DashboardBlangkoE-Tilang',
      view: 'Blangko',
      description: 'Monitoring blangko E-Tilang'
    },
    {
      id: 'dashboard-dakgar-lantas-fin',
      name: 'Dashboard DAKGAR LANTAS Final',
      workbook: 'DashboardDAKGARLANTAS_Fin',
      view: 'Dashboard',
      description: 'Dashboard DAKGAR LANTAS versi final'
    },
    {
      id: 'anatomi-perkara',
      name: 'Anatomi Perkara',
      workbook: 'AnatomiPerkara',
      view: 'Perkara',
      description: 'Analisis anatomi perkara tilang'
    },
    {
      id: 'dashboard-teguran',
      name: 'Dashboard Teguran',
      workbook: 'Teguran',
      view: 'Teguran',
      description: 'Dashboard monitoring teguran'
    },
    {
      id: 'dashboard-home',
      name: 'Dashboard Home',
      workbook: 'home',
      view: 'Home',
      description: 'Dashboard utama Korlantas'
    }
  ];
}

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

    // Create Tableau-specific JWT for embedded views according to Tableau Server documentation
    const tableauPayload = {
      "iss": TABLEAU_SERVER,
      "sub": decoded.username,
      "aud": "tableau",
      "exp": Math.floor(Date.now() / 1000) + (10 * 60), // 10 minutes
      "jti": Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      "scp": ["tableau:views:embed"],
      "https://tableau.com/oda": {
        "site": "",
        "content": {
          "workbook": workbook || "Superstore",
          "view": view || "Dashboard"
        }
      }
    };

    const tableauToken = jwt.sign(tableauPayload, TABLEAU_SECRET, { algorithm: 'HS256' });

    res.json({
      tableauToken,
      serverUrl: TABLEAU_SERVER,
      site: '',
      workbook: workbook || 'Superstore',
      view: view || 'Dashboard'
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Get available workbooks endpoint - fetches from Tableau Server
app.get('/api/workbooks', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    jwt.verify(token, JWT_SECRET);

    const workbooks = await fetchTableauWorkbooks();
    res.json({ workbooks });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    database: 'standalone-mode',
    tableau: 'connected',
    cache: workbooksCache ? 'active' : 'empty'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Tableau Server: ${TABLEAU_SERVER}`);
  console.log('Workbooks will be fetched from Tableau Server on first request');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
