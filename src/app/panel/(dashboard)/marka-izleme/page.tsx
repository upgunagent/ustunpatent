
import { createClient } from '@/lib/supabase/server';
import { BulletinMark } from '@/components/bulletins/BulletinTable';
import BulletinClientPage from './client-page';
import { getAllBulletinIssues } from '@/lib/bulletin';

export const dynamic = 'force-dynamic'; // Prevent caching
export const revalidate = 0; // Fresh data on request

export default async function BrandWatchPage(props: {
    searchParams?: Promise<{
        page?: string;
        limit?: string;
        markName?: string;
    }>;
}) {
    const searchParams = await props.searchParams;
    const page = Number(searchParams?.page) || 1;
    // We intentionally ignore markName here to prevent heavy server fetching on refresh.
    // const markName = searchParams?.markName || ''; 

    // Always fetch default view (not search mode server side)
    const isSearchMode = false; // Force false for server fetch
    const limit = 50;
    const offset = (page - 1) * 50;

    const supabase = await createClient();

    const query = supabase
        .from('bulletin_marks')
        .select('*', { count: 'exact' })
        .order('issue_no', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data: rawData, count } = await query;
    const initialData = (rawData || []) as BulletinMark[];
    const totalCount = count || 0;

    // Fetch bulletin options
    const bulletinOptions = await getAllBulletinIssues(supabase);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Marka İzleme</h1>

            <BulletinClientPage
                initialData={initialData}
                totalCount={totalCount}
                currentPage={page}
                limit={50}
                isSearchMode={isSearchMode}
                bulletinOptions={bulletinOptions}
            />
        </div>
    );
}
