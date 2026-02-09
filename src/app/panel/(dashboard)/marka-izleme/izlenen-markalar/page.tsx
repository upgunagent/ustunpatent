import { Suspense } from 'react';
import { getWatchedTrademarks } from '@/actions/watched-marks';
import { getAgencySettings } from '@/actions/settings';
import { LucideShieldCheck, LucideSearch, LucideFileText, LucideUser, LucideCalendar } from 'lucide-react';

import DownloadPdfButton from '@/components/watched-marks/DownloadPdfButton';
import WatchedMarksFilter from '@/components/watched-marks/WatchedMarksFilter';
import WatchedMarksTable from '@/components/watched-marks/WatchedMarksTable';

export const dynamic = 'force-dynamic';

interface PageProps {
    searchParams: Promise<{
        year?: string;
        month?: string;
    }>
}

export default async function WatchedMarksPage(props: PageProps) {
    const searchParams = await props.searchParams;
    const [marks, agencySettings] = await Promise.all([
        getWatchedTrademarks(searchParams.year, searchParams.month),
        getAgencySettings()
    ]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[#001a4f]">İzlenen Markalar</h1>
                    <p className="text-gray-500">
                        Sistemde "Marka İzleme Sözleşmesi" aktif olan tüm markaların listesi.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <WatchedMarksFilter />
                    <DownloadPdfButton marks={marks} />
                </div>
            </div>

            <WatchedMarksTable marks={marks} agencySettings={agencySettings} />
        </div>
    );
}
