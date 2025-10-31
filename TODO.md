 # TODO: Build Full Dashboard Portal with Backend, JWT, Tableau Integration, and Animations

## Step 1: Setup Backend with Express.js
- [x] Create backend directory and initialize Node.js project
- [x] Install dependencies: express, jsonwebtoken, bcryptjs, cors, dotenv
- [x] Create server.js with basic Express setup
- [x] Add JWT authentication endpoints (/login, /verify)
- [x] Add Tableau integration endpoint (/tableau-token) for JWT-based embed

## Step 2: Update Frontend for Backend Integration
- [x] Update package.json to include axios for API calls
- [x] Modify Login.jsx to call backend API for authentication
- [x] Update App.jsx to handle JWT token storage and verification
- [x] Modify Dashboard.jsx to fetch Tableau embed with JWT

## Step 3: Add Animations
- [x] Install framer-motion for animations
- [x] Add animations to Login page (fade-in, form transitions)
- [x] Add animations to Dashboard (loading states, transitions)

## Step 4: Integrate Tableau with JWT
- [x] Configure Tableau Server credentials in backend
- [x] Implement JWT generation for Tableau embed
- [x] Update Dashboard.jsx to embed Tableau using JWT

## Step 5: Testing and Final Touches
- [x] Test login flow with backend
- [x] Test Tableau embed
- [x] Add error handling and loading states
- [x] Polish UI with animations and responsive design

## Step 6: Multi-Workbook Support
- [x] Add /api/workbooks endpoint for fetching available workbooks
- [x] Update /api/tableau-token to support dynamic workbook/view selection
- [x] Add workbook selection UI in Dashboard component
- [x] Implement dynamic token generation for selected workbooks

## Step 7: Database Integration
- [x] Add PostgreSQL connection with pg library
- [x] Configure database credentials for dashboard_tableau
- [x] Update workbooks endpoint to fetch from database
- [x] Add health check endpoint for database connectivity
- [x] Update Tableau Server URL to http://103.154.174.60
- [x] Update Tableau site to 'korlantas'
