
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFirm() {
    const q = 'ferko';
    console.log(`Testing search for: "${q}"`);

    const { data, error } = await supabase
        .from('firms')
        .select('*')
        .or(`corporate_title.ilike.%${q}%,individual_name_surname.ilike.%${q}%,tpmk_owner_no.ilike.%${q}%`);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Firms found:', data.length);
    if (data.length > 0) {
        console.log('First match:', data[0].corporate_title || data[0].individual_name_surname);
    } else {
        console.log('Correctly found 0 results.');
    }
}

checkFirm();
