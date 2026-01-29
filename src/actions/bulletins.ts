'use server';

import { createClient } from '@/lib/supabase/server';
import { BulletinMark } from '@/components/bulletins/BulletinTable';

export async function searchBulletinMarks(markName: string) {
    if (!markName) return [];

    const supabase = await createClient();

    // Loop Fetching optimization
    let results: BulletinMark[] = [];
    let hasMore = true;
    let batchOffset = 0;
    const BATCH_SIZE = 1000;
    const SAFETY_LIMIT = 20000;

    try {
        while (hasMore) {
            const { data, error } = await supabase
                .from('bulletin_marks')
                .select('*')
                .order('issue_no', { ascending: false })
                .range(batchOffset, batchOffset + BATCH_SIZE - 1);

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
