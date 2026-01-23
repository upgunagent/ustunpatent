
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('Checking bulletin_marks...');

    // Get count
    const { count, error: countError } = await supabase
        .from('bulletin_marks')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('Count error:', countError);
    } else {
        console.log('Total rows:', count);
    }

    // Get sample
    const { data, error } = await supabase
        .from('bulletin_marks')
        .select('issue_no')
        .limit(10);

    if (error) {
        console.error('Sample error:', error);
    } else {
        console.log('Sample issue_no:', data);
    }
}

check();
