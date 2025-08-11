const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('Archy_XR_Mobile_API_v2.postman_collection.json', 'utf8'));
    console.log('✅ JSON is valid');
    console.log('📋 Collection:', data.info.name);
    console.log('📁 Main sections:', data.item.length);
    console.log('🔧 Variables:', data.variable.length);
} catch (e) {
    console.log('❌ JSON Error:', e.message);
}
