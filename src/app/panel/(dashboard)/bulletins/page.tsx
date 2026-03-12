import { createClient } from '@/lib/supabase/server';
import { BulletinMark } from '@/components/bulletins/BulletinTable';
import BulletinClientPage from './client-page';
import { getAllBulletinIssues } from '@/lib/bulletin';

export const dynamic = 'force-dynamic'; // Cachelemeyi önle
export const revalidate = 0; // Her istekte taze veri

export default async function BulletinPage(props: {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        markName?: string; // Marka adı arama parametresi
        bulletinNo?: string; // Bülten numarası (zorunlu arama parametresi)
    }>;
}) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    const markName = searchParams?.markName || '';
    const bulletinNo = searchParams?.bulletinNo || '';

    // Arama modu: bulletinNo seçildiğinde aktif olur
    const isSearchMode = !!bulletinNo;

    const supabase = await createClient();

    let initialData: BulletinMark[] = [];
    let totalCount = 0;

    if (isSearchMode) {
        // Seçilen bülten numarasına ait TÜM kayıtları çek
        // Tek bir bülten genelde birkaç bin kayıt olduğu için güvenlik limiti gerekmez
        let hasMore = true;
        let batchOffset = 0;
        const BATCH_SIZE = 1000;

        while (hasMore) {
            const { data, error } = await supabase
                .from('bulletin_marks')
                .select('*')
                .eq('issue_no', bulletinNo)
                .order('mark_text_540', { ascending: true })
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
        }
        totalCount = initialData.length;
    } else {
        // Normal mod: ilk sayfa pagination ile göster
        const offset = (page - 1) * 50;
        const { data: rawData, count } = await supabase
            .from('bulletin_marks')
            .select('*', { count: 'exact' })
            .order('issue_no', { ascending: false })
            .range(offset, offset + 49);

        initialData = (rawData || []) as BulletinMark[];
        totalCount = count || 0;
    }

    // Bülten numaralarını çek
    const bulletinOptions = await getAllBulletinIssues(supabase);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Bültenler</h1>

            <BulletinClientPage
                initialData={initialData}
                totalCount={totalCount}
                currentPage={page}
                limit={50}
                isSearchMode={isSearchMode}
                bulletinOptions={bulletinOptions}
                selectedBulletinNo={bulletinNo}
                searchedMarkName={markName}
            />
        </div>
    );
}
