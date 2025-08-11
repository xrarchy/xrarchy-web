// Simple test to check if location data is returned properly
console.log('🔧 Testing Admin API Location Fixes');

// Test the specific project ID you mentioned
const testProjectId = 'eab398bd-55f0-499b-be6e-f20c79b603ae';
const baseUrl = 'http://localhost:3000';

// Note: You need to get your admin token from browser dev tools
const adminToken = 'your_admin_token_here'; // Replace with actual token

async function testLocation() {
    try {
        console.log('\n📋 1. Testing GET project details...');
        const getResponse = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}`, {
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            }
        });

        const getResult = await getResponse.json();
        console.log('📊 GET Response Status:', getResponse.status);

        if (getResult.success && getResult.data.project) {
            const project = getResult.data.project;
            console.log('✅ Project Name:', project.name);
            console.log('📍 Location Object:', project.location ? 'PRESENT ✨' : 'MISSING ❌');

            if (project.location) {
                console.log('   📍 Coordinates:', project.location.latitude, ',', project.location.longitude);
                console.log('   📍 Name:', project.location.name || 'null');
                console.log('   📍 Address:', project.location.address || 'null');
                console.log('   📍 Description:', project.location.description || 'null');
            }
        } else {
            console.log('❌ GET failed:', getResult.error);
        }

        console.log('\n✏️ 2. Testing PUT project update...');
        const updateData = {
            name: 'Location Test Project',
            description: 'Testing location updates',
            location: {
                latitude: 51.5074,
                longitude: -0.1278,
                name: 'London',
                address: 'London, UK',
                description: 'Capital of England'
            }
        };

        const putResponse = await fetch(`${baseUrl}/api/admin/projects/${testProjectId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${adminToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const putResult = await putResponse.json();
        console.log('📊 PUT Response Status:', putResponse.status);

        if (putResult.success && putResult.data.project) {
            const project = putResult.data.project;
            console.log('✅ Updated Name:', project.name);
            console.log('📍 Location in Response:', project.location ? 'PRESENT ✨' : 'MISSING ❌');

            if (project.location) {
                console.log('   📍 New Coordinates:', project.location.latitude, ',', project.location.longitude);
                console.log('   📍 New Name:', project.location.name || 'null');
                console.log('   📍 New Address:', project.location.address || 'null');
            }
        } else {
            console.log('❌ PUT failed:', putResult.error);
        }

        console.log('\n🎯 Testing Summary:');
        console.log('• GET endpoint should now include location object');
        console.log('• PUT endpoint should return updated location data');
        console.log('• Both endpoints should handle null location values gracefully');

    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

console.log(`
🔑 Instructions:
1. Get your admin token from browser dev tools after login
2. Replace 'your_admin_token_here' with your actual token
3. Run: node location-test.js

📝 What we fixed:
- GET /api/admin/projects/{id} now includes location object
- PUT /api/admin/projects/{id} now returns location in response
- Both handle null/empty location values properly
`);

// Uncomment to run test (after adding your token)
// testLocation();
