const API_BASE_URL = 'http://localhost:3000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IjhMOWNtZnBPOGxqYnNhanoiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2pxaXB1cWR0aWllY2F5dHJsaXdqLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJhM2U3MzVkYi04OTgyLTRhMzEtYjViOS0wZmY5YWFmZTY5ZmYiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU0ODY4MDE3LCJpYXQiOjE3NTQ4NjQ0MTcsImVtYWlsIjoiY2luYW5pMTUyN0Bjb3Rhc2VuLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWxfdmVyaWZpZWQiOnRydWUsInJvbGUiOiJBcmNoaXZpc3QifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc1NDg2NDQxN31dLCJzZXNzaW9uX2lkIjoiNDNmYmE2MjMtNTcxMC00ZWM4LTg3ODgtNjllMWRhMGZmZDkxIiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.WZZSS5ceqJu7D0q0k6sNohp-Xe4IMQR5fprOreakOMM';

async function testAdminProjects() {
    try {
        console.log('🧪 Testing Admin Projects API - Created By field fix...\n');

        const response = await fetch(`${API_BASE_URL}/api/admin/projects`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Failed to fetch admin projects:', response.status, response.statusText);
            return;
        }

        const data = await response.json();

        console.log('✅ Admin Projects API Response:');
        console.log('Total Projects:', data.data?.total_count || 0);
        console.log('User Role:', data.data?.user_role);
        console.log('\n📋 Projects with Created By info:\n');

        if (data.data?.projects?.length > 0) {
            data.data.projects.forEach((project, index) => {
                console.log(`${index + 1}. ${project.name}`);
                console.log(`   Created By ID: ${project.created_by || 'Not set'}`);
                console.log(`   Created By Email: ${project.created_by_email || 'Unknown'}`);
                console.log(`   Created At: ${new Date(project.created_at).toLocaleString()}`);
                console.log(`   Members: ${project.assignment_count}`);
                console.log('   ---');
            });

            // Check if any projects still show "Unknown" for created_by_email
            const unknownCreators = data.data.projects.filter(p => p.created_by_email === 'Unknown');

            if (unknownCreators.length === 0) {
                console.log('\n✅ SUCCESS: All projects now show creator information!');
            } else {
                console.log(`\n⚠️  WARNING: ${unknownCreators.length} projects still show "Unknown" for created_by_email:`);
                unknownCreators.forEach(p => {
                    console.log(`   - ${p.name} (ID: ${p.created_by || 'null'})`);
                });
            }
        } else {
            console.log('No projects found.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testAdminProjects();
