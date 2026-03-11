
import { SupabaseClient } from '@supabase/supabase-js';

// Supabase RPC ile distinct bülten numaralarını hızlıca çeker
// Fallback: RPC yoksa eski yöntemle tüm tabloyu tarar
export async function getAllBulletinIssues(supabase: SupabaseClient) {
    // Try RPC first (fast - single DISTINCT query)
    try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_distinct_bulletin_issues');

        if (!rpcError && rpcData && rpcData.length > 0) {
            return rpcData.map((row: { issue_no: string }) => row.issue_no);
        }

        if (rpcError) {
            console.warn('RPC get_distinct_bulletin_issues not available, falling back to scan:', rpcError.message);
        }
    } catch (e) {
        console.warn('RPC call failed, falling back to scan:', e);
    }

    // Fallback: scan table (slow but works without RPC)
    const allIssues: number[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;
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

    const uniqueIssues = Array.from(new Set(allIssues))
        .sort((a, b) => b - a);

    return uniqueIssues.map(String);
}
