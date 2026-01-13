const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM'.trim(); // No trim test logic included implicitly

async function test(name, headers) {
    const url = `${SUPABASE_URL}/rest/v1/n8n_chat_histories?select=count&limit=1`;
    try {
        const res = await fetch(url, { headers });
        console.log(`[${name}] Status: ${res.status}`);
    } catch (e) {
        console.log(`[${name}] Error: ${e.message}`);
    }
}

async function run() {
    await test('Both', { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}` });
    await test('Only apikey', { 'apikey': API_KEY });
    await test('Only Auth', { 'Authorization': `Bearer ${API_KEY}` });
    // Test lowercasing explicitly (fetch does this automatically usually)
    await test('Lowercase', { 'apikey': API_KEY, 'authorization': `Bearer ${API_KEY}` });
}

run();
