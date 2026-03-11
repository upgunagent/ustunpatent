'use server';

import { createClient } from '@/lib/supabase/server';
import { BulletinMark } from '@/components/bulletins/BulletinTable';

export async function searchBulletinMarks(markName: string, bulletinNo?: string) {
    if (!markName) return [];

    const supabase = await createClient();

    // Loop Fetching optimization
    let results: BulletinMark[] = [];
    let hasMore = true;
    let batchOffset = 0;
    const BATCH_SIZE = 1000;
    const SAFETY_LIMIT = 10000;

    try {
        while (hasMore) {
            let query = supabase
                .from('bulletin_marks')
                .select('*')
                .order('issue_no', { ascending: false });

            // Filter by bulletin number if provided (major performance improvement)
            if (bulletinNo) {
                query = query.eq('issue_no', bulletinNo);
            }

            query = query.range(batchOffset, batchOffset + BATCH_SIZE - 1);

            const { data, error } = await query;

            if (error) {
                console.error("Search fetch error:", error);
                break;
            }

            if (data && data.length > 0) {
                results = [...results, ...data as BulletinMark[]];
                batchOffset += BATCH_SIZE;

                if (data.length < BATCH_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }

            if (results.length >= SAFETY_LIMIT) {
                hasMore = false;
                break;
            }
        }
    } catch (e) {
        console.error("Search exception:", e);
    }

    return results;
}
