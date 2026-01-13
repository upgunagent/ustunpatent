const { createClient } = require('@supabase/supabase-js');

// The key provided by the user
const supabaseUrl = 'https://qmotrqehdzebojdowuol.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function verify() {
    console.log('--- Testing Database Connection ---');
    // Try to access the public table n8n_chat_histories
    const { data, error: dbError } = await supabase
        .from('n8n_chat_histories')
        .select('count', { count: 'exact', head: true });

    if (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
    } else {
        console.log('✅ Database connection SUCCESS! Count:', data);
    }

    console.log('\n--- Testing Auth Admin Connection ---');
    // Try to list users
    const { data: userData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (authError) {
        console.error('❌ Auth Admin failed:', authError.message);
    } else {
        console.log('✅ Auth Admin SUCCESS! User count:', userData.users.length);
    }
}

verify();
