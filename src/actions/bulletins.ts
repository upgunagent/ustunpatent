'use server';

import { createClient } from '@/lib/supabase/server';
import { BulletinMark } from '@/components/bulletins/BulletinTable';

export async function searchBulletinMarks(markName: string, bulletinNo: string) {
    if (!bulletinNo) return [];

    const supabase = await createClient();

    // Seçilen bülten numarasına ait tüm kayıtları çek
    let results: BulletinMark[] = [];
    let hasMore = true;
    let batchOffset = 0;
    const BATCH_SIZE = 1000;

    try {
        while (hasMore) {
            const { data, error } = await supabase
                .from('bulletin_marks')
                .select('*')
                .eq('issue_no', bulletinNo)
                .order('mark_text_540', { ascending: true })
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
        }
    } catch (e) {
        console.error("Search exception:", e);
    }

    return results;
}

