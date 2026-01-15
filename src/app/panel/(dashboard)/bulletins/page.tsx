import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { BulletinMark } from '@/components/bulletins/BulletinTable';
import BulletinClientPage from './client-page';

export const dynamic = 'force-dynamic'; // Cachelemeyi önle
export const revalidate = 0; // Her istekte taze veri

export default async function BulletinPage(props: {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        markName?: string; // Marka adı arama parametresi
    }>;
}) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    const markName = searchParams?.markName || '';

    // Eğer arama yapılıyorsa TÜM kayıtları fetch et, yoksa normal pagination
    const isSearchMode = !!markName;
    const limit = isSearchMode ? 10000 : 50; // Arama modunda limit yok (max 10K güvenlik)
    const offset = isSearchMode ? 0 : (page - 1) * 50;

    const supabase = await createClient();

    const query = supabase
        .from('bulletin_marks')
        .select('*', { count: 'exact' })
        .order('issue_no', { ascending: false });

    // Normal modda pagination uygula
    if (!isSearchMode) {
        query.range(offset, offset + 49);
    }

    let initialData: BulletinMark[] = [];
    let totalCount = 0;

    if (isSearchMode) {
        // Loop Fetching: Supabase 1000 limitini aşmak için parça parça çek
        // 5000-10000 kayıt için uygundur. Milyonluk veride bu yöntem server-side search'e dönmelidir.
        let hasMore = true;
        let batchOffset = 0;
        const BATCH_SIZE = 1000;

        while (hasMore) {
            console.log(`Fetching batch: ${batchOffset} - ${batchOffset + BATCH_SIZE}`);
            const { data, error } = await supabase
                .from('bulletin_marks')
                .select('*')
                .order('issue_no', { ascending: false })
                .range(batchOffset, batchOffset + BATCH_SIZE - 1);

            if (error) {
                console.error("Fetch error:", error);
                break;
            }

            if (data && data.length > 0) {
                initialData = [...initialData, ...data as BulletinMark[]];
                batchOffset += BATCH_SIZE;

                // Eğer gelen veri paketi batch size'dan küçükse sonuna geldik demektir
                if (data.length < BATCH_SIZE) hasMore = false;
            } else {
                hasMore = false;
            }

            // Güvenlik limiti (sonsuz döngüden kaçınmak için şimdilik 20K)
            if (initialData.length >= 20000) hasMore = false;
        }
        totalCount = initialData.length;
    } else {
        const { data: rawData, count } = await query;
        initialData = (rawData || []) as BulletinMark[];
        totalCount = count || 0;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Bültenler</h1>

            <BulletinClientPage
                initialData={initialData}
                totalCount={totalCount}
                currentPage={page}
                limit={50}
                isSearchMode={isSearchMode}
            />
        </div>
    );
}
