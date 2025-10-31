const axios = require('axios');
const https = require('https');

// Tableau Server configuration
const TABLEAU_SERVER = 'http://103.154.174.60';
const USERNAME = 'korlantas';
const PASSWORD = '4ministrator!';

// Create axios instance with proper SSL configuration
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // For self-signed certificates
  }),
  timeout: 30000
});

// Function to try different authentication methods
async function authenticateTableau() {
  const authMethods = [
    {
      name: 'Default Site',
      payload: {
        credentials: {
          name: USERNAME,
          password: PASSWORD,
          site: {
            contentUrl: 'korlantas'
          }
        }
      }
    },
    {
      name: 'No Site Specified',
      payload: {
        credentials: {
          name: USERNAME,
          password: PASSWORD
        }
      }
    },
    {
      name: 'Empty Site',
      payload: {
        credentials: {
          name: USERNAME,
          password: PASSWORD,
          site: {
            contentUrl: ''
          }
        }
      }
    }
  ];

  for (const method of authMethods) {
    try {
      console.log(`\n🔄 Trying authentication method: ${method.name}`);
      console.log('📨 Payload:', JSON.stringify(method.payload, null, 2));

      const signInUrl = `${TABLEAU_SERVER}/api/3.21/auth/signin`;
      const response = await axiosInstance.post(signInUrl, method.payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('✅ Authentication successful with method:', method.name);
      return {
        success: true,
        token: response.data.credentials.token,
        siteId: response.data.credentials.site.id,
        method: method.name
      };

    } catch (error) {
      console.log(`❌ Method ${method.name} failed:`, error.response?.data?.error?.detail || error.message);
    }
  }

  return { success: false, error: 'All authentication methods failed' };
}

// Function to get sites first
async function getSites() {
  try {
    console.log('\n🏢 Getting available sites...');

    // Try to get sites without authentication first
    const sitesUrl = `${TABLEAU_SERVER}/api/3.21/sites`;

    // This might require authentication, but let's try
    const response = await axiosInstance.get(sitesUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('📊 Available sites:', response.data.sites.site);
    return response.data.sites.site;

  } catch (error) {
    console.log('❌ Could not get sites without auth:', error.response?.data || error.message);
    return null;
  }
}

// Function to authenticate and get workbooks
async function getTableauWorkbooks() {
  try {
    // First, try to get sites
    await getSites();

    // Then try authentication
    const authResult = await authenticateTableau();

    if (!authResult.success) {
      console.error('❌ Authentication failed with all methods');
      return authResult;
    }

    const { token, siteId, method } = authResult;

    console.log(`\n🔑 Using auth method: ${method}`);
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
      totalCount: workbooks.length,
      authMethod: method
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

// Main execution
async function main() {
  console.log('🚀 Tableau Workbook Checker v2');
  console.log('==============================');
  console.log(`🌐 Server: ${TABLEAU_SERVER}`);
  console.log(`👤 User: ${USERNAME}`);
  console.log('');

  const result = await getTableauWorkbooks();

  if (result.success) {
    console.log(`✅ Successfully connected using: ${result.authMethod}`);
    console.log(`📊 Total workbooks: ${result.totalCount}`);
  } else {
    console.log('❌ Failed to get workbooks');
  }

  console.log('\n✨ Done!');
}

// Export functions for use in other modules
module.exports = {
  getTableauWorkbooks,
  authenticateTableau,
  getSites
};

// Run if called directly
if (require.main === module) {
  main();
}
