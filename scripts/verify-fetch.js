const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM'.trim();

async function run() {
    const url = `${SUPABASE_URL}/rest/v1/n8n_chat_histories?select=count&limit=1`;
    console.log(`Connecting to: ${url}`);
    // console.log(`Using Key: ${API_KEY.substring(0, 10)}...`);

    try {
        const res = await fetch(url, {
            headers: {
                'apikey': API_KEY,
                'Authorization': `Bearer ${API_KEY}`
            }
        });

        console.log('Status Code:', res.status);
        console.log('Status Text:', res.statusText);
        const text = await res.text();
        console.log('Body:', text);
    } catch (e) {
        console.error(e);
    }
}

run();
