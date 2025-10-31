const axios = require('axios');
const https = require('https');

// Tableau Server configuration
const TABLEAU_SERVER = 'http://103.154.174.60';
const TABLEAU_SITE = ''; // Site name
const USERNAME = 'korlantas';
const PASSWORD = '4ministrator!';

// Create axios instance with proper SSL configuration
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // For self-signed certificates
  }),
  timeout: 30000
});

// Function to authenticate and get workbooks
async function getTableauWorkbooks() {
  try {
    console.log('🔐 Authenticating with Tableau Server...');

    // Step 1: Sign in to Tableau Server
    const signInUrl = `${TABLEAU_SERVER}/api/3.21/auth/signin`;

    const signInPayload = {
      credentials: {
        name: USERNAME,
        password: PASSWORD,
        site: {
          contentUrl: TABLEAU_SITE
        }
      }
    };

    const signInResponse = await axiosInstance.post(signInUrl, signInPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const token = signInResponse.data.credentials.token;
    const siteId = signInResponse.data.credentials.site.id;

    console.log('✅ Authentication successful!');
    console.log(`🔑 Token: ${token}`);
    console.log(`🏢 Site ID: ${siteId}`);

    // Step 2: Get workbooks
    console.log('\n📚 Fetching workbooks...');

    const workbooksUrl = `${TABLEAU_SERVER}/api/3.21/sites/${siteId}/workbooks`;

    const workbooksResponse = await axiosInstance.get(workbooksUrl, {
      headers: {
        'X-Tableau-Auth': token,
        'Accept': 'application/json'
      }
    });

    const workbooks = workbooksResponse.data.workbooks.workbook;

    console.log(`\n📊 Found ${workbooks.length} workbooks:\n`);

    // Display workbooks in a nice format
    workbooks.forEach((workbook, index) => {
      console.log(`${index + 1}. 📖 ${workbook.name}`);
      console.log(`   🔗 Content URL: ${workbook.contentUrl}`);
      console.log(`   👤 Owner: ${workbook.owner.name}`);
      console.log(`   📅 Created: ${new Date(workbook.createdAt).toLocaleDateString()}`);
      console.log(`   🔄 Updated: ${new Date(workbook.updatedAt).toLocaleDateString()}`);
      console.log(`   📏 Size: ${workbook.size} bytes`);
      console.log(`   🏷️  Tags: ${workbook.tags?.tag?.map(tag => tag.label).join(', ') || 'None'}`);
      console.log('');
    });

    // Return workbooks data for potential use
    return {
      success: true,
      workbooks: workbooks.map(workbook => ({
        id: workbook.id,
        name: workbook.name,
        contentUrl: workbook.contentUrl,
        owner: workbook.owner.name,
        createdAt: workbook.createdAt,
        updatedAt: workbook.updatedAt,
        size: workbook.size,
        tags: workbook.tags?.tag?.map(tag => tag.label) || []
      })),
      totalCount: workbooks.length
    };

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.error('🔐 Authentication failed. Please check your credentials.');
    } else if (error.response?.status === 404) {
      console.error('🏢 Site not found. Please check the site name.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🌐 Cannot connect to Tableau Server. Please check the server URL.');
    }

    return {
      success: false,
      error: error.response?.data || error.message
    };
  }
}

// Function to get workbook views
async function getWorkbookViews(workbookId) {
  try {
    console.log(`\n👀 Fetching views for workbook: ${workbookId}`);

    // First authenticate
    const signInUrl = `${TABLEAU_SERVER}/api/3.21/auth/signin`;

    const signInPayload = {
      credentials: {
        name: USERNAME,
        password: PASSWORD,
        site: {
          contentUrl: TABLEAU_SITE
        }
      }
    };

    const signInResponse = await axiosInstance.post(signInUrl, signInPayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const token = signInResponse.data.credentials.token;
    const siteId = signInResponse.data.credentials.site.id;

    // Get views for specific workbook
    const viewsUrl = `${TABLEAU_SERVER}/api/3.21/sites/${siteId}/workbooks/${workbookId}/views`;

    const viewsResponse = await axiosInstance.get(viewsUrl, {
      headers: {
        'X-Tableau-Auth': token,
        'Accept': 'application/json'
      }
    });

    const views = viewsResponse.data.views.view;

    console.log(`📊 Found ${views.length} views:`);
    views.forEach((view, index) => {
      console.log(`${index + 1}. 👁️  ${view.name}`);
      console.log(`   🔗 Content URL: ${view.contentUrl}`);
      console.log(`   📅 Created: ${new Date(view.createdAt).toLocaleDateString()}`);
      console.log('');
    });

    return views;

  } catch (error) {
    console.error('❌ Error fetching views:', error.response?.data || error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Tableau Workbook Checker');
  console.log('==========================');
  console.log(`🌐 Server: ${TABLEAU_SERVER}`);
  console.log(`🏢 Site: ${TABLEAU_SITE}`);
  console.log(`👤 User: ${USERNAME}`);
  console.log('');

  const result = await getTableauWorkbooks();

  if (result.success && result.workbooks.length > 0) {
    console.log('\n🔍 Getting views for first workbook as example...');
    const firstWorkbook = result.workbooks[0];
    await getWorkbookViews(firstWorkbook.id);
  }

  console.log('\n✨ Done!');
}

// Export functions for use in other modules
module.exports = {
  getTableauWorkbooks,
  getWorkbookViews
};

// Run if called directly
if (require.main === module) {
  main();
}
