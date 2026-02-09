
import { SupabaseClient } from '@supabase/supabase-js';

// Supabase'den pagination ile tüm bülten numaralarını çeker
export async function getAllBulletinIssues(supabase: SupabaseClient) {
    const allIssues: number[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // API limit is likely 1000 rows

    // Safety limit: 200k records (20 pages) to prevent infinite loops locally
    // In production with huge data, this logic should move to an RPC function or a dedicated 'bulletins' table.
    const MAX_PAGES = 50;

    while (hasMore && page < MAX_PAGES) {
        const { data, error } = await supabase
            .from('bulletin_marks')
            .select('issue_no')
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Error fetching bulletin issues:', error);
            break;
        }

        if (data) {
            const issues = data.map(d => d.issue_no).filter(Boolean).map(Number);
            allIssues.push(...issues);

            if (data.length < pageSize) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }

        page++;
    }

    // Unique ve sort işlemleri
    const uniqueIssues = Array.from(new Set(allIssues))
        .sort((a, b) => b - a);

    return uniqueIssues.map(String);
}
