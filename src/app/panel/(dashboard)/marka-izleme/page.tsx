
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
    const supabase = await createClient();

    // Only fetch bulletin options (fast with RPC, no heavy table scan)
    const bulletinOptions = await getAllBulletinIssues(supabase);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Marka İzleme</h1>

            <BulletinClientPage
                initialData={[]}
                totalCount={0}
                currentPage={1}
                limit={50}
                isSearchMode={false}
                bulletinOptions={bulletinOptions}
            />
        </div>
    );
}
