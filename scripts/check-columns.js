const https = require('https');

const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3RycWVoZHplYm9qZG93dW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzI5MjQsImV4cCI6MjA4MzgwODkyNH0.tRCTYAcMOSWA1z_TSk4-HwyS74f1s01lYfIDO_NV_Ls';

const url = `${SUPABASE_URL}/rest/v1/n8n_chat_histories?select=*&limit=1`;

const options = {
    headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
    }
};

https.get(url, options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('Keys in first row:', Object.keys(json[0]));
        } catch (e) {
            console.error('Error parsing JSON:', e);
            console.log('Raw data:', data);
        }
    });
}).on('error', (e) => {
    console.error(e);
});
