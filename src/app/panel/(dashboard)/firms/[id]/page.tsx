import { createClient } from "@/lib/supabase/server";
import FirmDetails from "@/components/firms/FirmDetails";
import Link from "next/link";
import { LucideArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getAgencySettings } from "@/actions/settings";

export const dynamic = 'force-dynamic';

import DeleteFirmButton from "@/components/firms/DeleteFirmButton";

export default async function FirmDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;

    if (!params.id) {
        return notFound();
    }

    const supabase = await createClient();
    const { data: firm } = await supabase
        .from('firms')
        .select('*')
        .eq('id', params.id)
        .single();

    if (!firm) {
        return notFound();
    }

    // Trademarks
    const { data: trademarks } = await supabase
        .from('firm_trademarks')
        .select('*')
        .eq('firm_id', firm.id)
        .order('created_at', { ascending: false });

    // Agency Settings for consultants
    const agencySettings = await getAgencySettings();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Link
                    href="/panel/firms"
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900"
                >
                    <LucideArrowLeft size={16} />
                    Firmalar Listesine Dön
                </Link>
                <DeleteFirmButton firmId={firm.id} />
            </div>

            <FirmDetails firm={firm} trademarks={trademarks || []} agencySettings={agencySettings} />
        </div>
    );
}
