
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastAction() {
    console.log('Checking last firm_action...');
    const { data: actions, error } = await supabase
        .from('firm_actions')
        .select('*')
        .eq('type', 'contract_sent')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching actions:', error);
        return;
    }

    if (!actions || actions.length === 0) {
        console.log('No contract_sent actions found.');
        return;
    }

    const lastAction = actions[0];
    console.log('Last Action ID:', lastAction.id);
    console.log('Created At:', lastAction.created_at);
    console.log('Metadata:', JSON.stringify(lastAction.metadata, null, 2));

    if (lastAction.metadata?.pdf_url) {
        console.log('SUCCESS: pdf_url found:', lastAction.metadata.pdf_url);
    } else {
        console.log('FAILURE: pdf_url is MISSING in metadata.');
    }
}

checkLastAction();
