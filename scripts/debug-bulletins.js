
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://qmotrqehdzebojdowuol.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3RycWVoZHplYm9qZG93dW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzI5MjQsImV4cCI6MjA4MzgwODkyNH0.tRCTYAcMOSWA1z_TSk4-HwyS74f1s01lYfIDO_NV_Ls';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function getAllBulletinIssues() {
    console.log('Starting fetch...');
    let allIssues = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;
    const MAX_PAGES = 50;

    while (hasMore && page < MAX_PAGES) {
        console.log(`Fetching page ${page}...`);
        const { data, error } = await supabase
            .from('bulletin_marks')
            .select('issue_no')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching bulletin issues:', error);
            break;
        }

        if (data && data.length > 0) {
            console.log(`Got ${data.length} rows.`);

            // Log raw sample
            console.log('Sample raw issue_no:', data.slice(0, 5).map(d => d.issue_no));

            const issues = data.map(d => d.issue_no).filter(Boolean).map(Number);
            allIssues.push(...issues);

            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            console.log('No data returned.');
            hasMore = false;
        }

        page++;
    }

    const uniqueIssues = Array.from(new Set(allIssues)).sort((a, b) => b - a);
    console.log('Unique Issues found:', uniqueIssues);
}

getAllBulletinIssues();
