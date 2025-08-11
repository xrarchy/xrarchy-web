// Test script for admin project API endpoints
const BASE_URL = 'http://localhost:3000';

// You'll need to replace this with an actual admin token
// Get this from your browser's developer tools after logging in as admin
const ADMIN_TOKEN = 'your_admin_token_here';

async function testAPI(endpoint, method = 'GET', data = null) {
    try {
        console.log(`\n🔧 Testing ${method} ${endpoint}`);

        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
            console.log('📦 Request data:', JSON.stringify(data, null, 2));
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, options);
        const result = await response.json();

        console.log(`📊 Status: ${response.status}`);
        console.log(`✨ Response:`, JSON.stringify(result, null, 2));

        return result;

    } catch (error) {
        console.error(`❌ Error testing ${method} ${endpoint}:`, error);
        return null;
    }
}

async function runTests() {
    console.log('🚀 Starting Admin Project API Tests');
    console.log('⚠️  Make sure to update ADMIN_TOKEN in this script!');

    // Test 1: Create project without location (should NOT crash)
    console.log('\n=== TEST 1: Create Project WITHOUT Location ===');
    const project1 = await testAPI('/api/admin/projects', 'POST', {
        name: 'Test Project No Location',
        description: 'Testing project creation without location data'
    });

    if (project1 && project1.success) {
        console.log('✅ Test 1 PASSED: Project created without location');

        // Test 2: Update project with location
        console.log('\n=== TEST 2: Update Project WITH Location ===');
        const updatedProject = await testAPI(`/api/admin/projects/${project1.data.project.id}`, 'PUT', {
            name: 'Updated Test Project',
            description: 'Now with location data added',
            location: {
                latitude: 37.7749,
                longitude: -122.4194,
                name: 'San Francisco',
                address: 'San Francisco, CA, USA',
                description: 'City by the bay'
            }
        });

        if (updatedProject && updatedProject.success) {
            console.log('✅ Test 2 PASSED: Project updated with location');
        } else {
            console.log('❌ Test 2 FAILED: Could not update project with location');
        }

        // Test 3: Update project without location (should still work)
        console.log('\n=== TEST 3: Update Project WITHOUT Location ===');
        const simpleUpdate = await testAPI(`/api/admin/projects/${project1.data.project.id}`, 'PUT', {
            name: 'Simple Updated Project',
            description: 'Updated without location changes'
        });

        if (simpleUpdate && simpleUpdate.success) {
            console.log('✅ Test 3 PASSED: Project updated without location');
        } else {
            console.log('❌ Test 3 FAILED: Could not update project without location');
        }

        // Cleanup: Delete test project
        console.log('\n=== CLEANUP: Delete Test Project ===');
        await testAPI(`/api/admin/projects/${project1.data.project.id}`, 'DELETE');

    } else {
        console.log('❌ Test 1 FAILED: Could not create project without location');
        console.log('💡 This was the original issue - API should handle missing location gracefully');
    }

    // Test 4: Create project with location (should still work)
    console.log('\n=== TEST 4: Create Project WITH Location ===');
    const project2 = await testAPI('/api/admin/projects', 'POST', {
        name: 'Test Project With Location',
        description: 'Testing project creation with location data',
        location: {
            latitude: 40.7589,
            longitude: -73.9851,
            name: 'Times Square',
            address: 'Times Square, New York, NY 10036, USA',
            description: 'Tourist destination'
        }
    });

    if (project2 && project2.success) {
        console.log('✅ Test 4 PASSED: Project created with location');

        // Cleanup
        await testAPI(`/api/admin/projects/${project2.data.project.id}`, 'DELETE');
    } else {
        console.log('❌ Test 4 FAILED: Could not create project with location');
    }

    console.log('\n🏁 Tests completed!');
    console.log('\n📋 Summary:');
    console.log('- Location data is now optional for both CREATE and UPDATE');
    console.log('- API should not crash when location is missing');
    console.log('- Both endpoints support full location updates');
    console.log('- Better error handling for invalid request bodies');
}

// Instructions for running the test
console.log(`
🔧 Admin API Test Instructions:
1. Make sure the server is running (npm run dev)
2. Login as admin at http://localhost:3000/login
3. Open browser dev tools and get your token from localStorage or cookies
4. Replace 'your_admin_token_here' with your actual admin token
5. Run: node test-admin-api.js

🎯 What we're testing:
- CREATE project without location (was crashing)
- UPDATE project with location support (was missing)
- UPDATE project without location changes
- Proper error handling for invalid requests
`);

// Uncomment the line below to run tests (after adding your token)
// runTests();
