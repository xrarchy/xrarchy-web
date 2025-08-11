const API_BASE_URL = 'http://localhost:3000';
const PROJECT_ID = 'ef51745f-3ba2-440f-ab73-343070c6c5af';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjhMOWNtZnBPOGxqYnNhanoiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pxaXB1cWR0aWllY2F5dHJsaXdqLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhM2U3MzVkYi04OTgyLTRhMzEtYjViOS0wZmY5YWFmZTY5ZmYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0ODY4MDE3LCJpYXQiOjE3NTQ4NjQ0MTcsImVtYWlsIjoiY2luYW5pMTUyN0Bjb3Rhc2VuLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsInJvbGUiOiJBcmNoaXZpc3QifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NDg2NDQxN31dLCJzZXNzaW9uX2lkIjoiNDNmYmE2MjMtNTcxMC00ZWM4LTg3ODgtNjllMWRhMGZmZDkxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.WZZSS5ceqJu7D0q0k6sNohp-Xe4IMQR5fprOreakOMM';

async function testFileLocationAPI() {
    console.log('🧪 Testing File Upload with Location Support...\n');

    try {
        // Test 1: Get current files to see if location is returned
        console.log('1️⃣ Testing GET files with location data...');
        const getResponse = await fetch(`${API_BASE_URL}/api/projects/${PROJECT_ID}/files`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        });

        if (getResponse.ok) {
            const filesData = await getResponse.json();
            console.log('✅ Files API response received');
            console.log(`   📁 Total files: ${filesData.projectFiles?.length || 0}`);
            
            if (filesData.projectFiles?.length > 0) {
                const filesWithLocation = filesData.projectFiles.filter(f => f.latitude && f.longitude);
                console.log(`   📍 Files with location: ${filesWithLocation.length}`);
                
                if (filesWithLocation.length > 0) {
                    console.log('   📋 Sample file with location:');
                    const sample = filesWithLocation[0];
                    console.log(`      Name: ${sample.filename}`);
                    console.log(`      Location: ${sample.latitude}, ${sample.longitude}`);
                }
            }
        } else {
            console.log('❌ Failed to get files:', getResponse.status);
        }

        // Test 2: Test mobile API
        console.log('\n2️⃣ Testing Mobile API with location data...');
        const mobileResponse = await fetch(`${API_BASE_URL}/api/mobile/projects/${PROJECT_ID}/files`, {
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        });

        if (mobileResponse.ok) {
            const mobileData = await mobileResponse.json();
            console.log('✅ Mobile API response received');
            console.log(`   📁 Total files: ${mobileData.data?.files?.length || 0}`);
            
            if (mobileData.data?.files?.length > 0) {
                const filesWithLocation = mobileData.data.files.filter(f => f.location);
                console.log(`   📍 Files with location: ${filesWithLocation.length}`);
                
                if (filesWithLocation.length > 0) {
                    console.log('   📋 Sample mobile file with location:');
                    const sample = filesWithLocation[0];
                    console.log(`      Name: ${sample.name}`);
                    console.log(`      Location: ${sample.location.latitude}, ${sample.location.longitude}`);
                }
            }
        } else {
            console.log('❌ Failed to get mobile files:', mobileResponse.status);
        }

        console.log('\n🎉 File location API testing completed!');
        console.log('\n💡 Next steps:');
        console.log('   - Open the admin files page in browser');
        console.log('   - Try uploading a file with location');
        console.log('   - Use "Get Current Location" button to auto-fill coordinates');
        console.log('   - Verify location appears in file list');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testFileLocationAPI();
