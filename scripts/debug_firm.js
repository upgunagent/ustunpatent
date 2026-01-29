
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
try {
    const envPath = path.resolve(__dirname, '../.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
} catch (e) {
    console.log('Could not read .env.local', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key if available to bypass RLS
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Using key:', supabaseKey ? 'Found' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFirm() {
    const { data, error } = await supabase
        .from('firms')
        .select('*')
        .ilike('name', '%Upgun%');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Firms found with name Upgun:', data.length);
    data.forEach(f => {
        console.log('ID:', f.id);
        console.log('Type:', f.type);
        console.log('Name (generic):', f.name);
        console.log('Corp Title:', f.corporate_title);
        console.log('Indiv Name:', f.individual_name_surname);
        console.log('Owner No:', f.tpmk_owner_no);

        console.log('CHECK MATCH "fer":');
        console.log('- Corp Title match:', (f.corporate_title || '').toLowerCase().includes('fer'));
        console.log('- Indiv Name match:', (f.individual_name_surname || '').toLowerCase().includes('fer'));
        console.log('- Owner No match:', (f.tpmk_owner_no || '').toLowerCase().includes('fer'));
    });
}

checkFirm();
