const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectSchema() {
    console.log('Fetching list of tables...');

    // Actually, standard listing is not easy without SQL editor access.
    // But we can try to guess or just list known tables.
    // However, we can query "information_schema.tables" via rpc if enabled, or just try to select * from common names.
    // A better way is to simply try to select from 'chat_logs', 'messages', 'conversations', 'talks' and see what works.

    const potentialTables = ['chat_logs', 'messages', 'conversations', 'sessions', 'talks', 'webhook_data', 'patentcan_logs'];

    for (const table of potentialTables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
            console.log(`\n✅ Found table: "${table}"`);
            if (data && data.length > 0) {
                console.log('Sample row keys:', Object.keys(data[0]));
                console.log('Sample row:', data[0]);
            } else {
                console.log('Table exists but is empty.');
            }
        } else {
            // console.log(`❌ Table "${table}" not found or error:`, error.message);
        }
    }

    // Attempt to select from "conversations" specifically as hinted by user
    console.log('\n--- Checking "conversations" specifically ---');
    const { data: convData, error: convError } = await supabase.from('conversations').select('*').limit(5);
    if (convError) console.log('Error fetching conversations:', convError.message);
    else console.log('Conversations sample:', convData);
}

inspectSchema();
