import { createClient } from "@/lib/supabase/server";
import FirmDetails from "@/components/firms/FirmDetails";
import Link from "next/link";
import { LucideArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function FirmDetailsPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params; // Await params in Next.js 15+

    if (!params.id) {
        return notFound();
    }

    const supabase = await createClient();

    // Fetch Firm Details
    const { data: firm, error: firmError } = await supabase
        .from("firms")
        .select("*")
        .eq("id", params.id)
        .single();

    if (firmError || !firm) {
        console.error("Error fetching firm:", firmError);
        return <div>Firma bulunamadı veya bir hata oluştu.</div>;
    }

    // Fetch Trademarks
    const { data: trademarks, error: trademarksError } = await supabase
        .from("firm_trademarks")
        .select("*")
        .eq("firm_id", params.id)
        .order("created_at", { ascending: false });

    if (trademarksError) {
        console.error("Error fetching trademarks:", trademarksError);
    }

    return (
        <div className="space-y-6">
            <Link
                href="/panel/firms"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#001a4f] transition-colors"
            >
                <LucideArrowLeft size={16} />
                Firmalar Listesine Dön
            </Link>

            <FirmDetails firm={firm} trademarks={trademarks || []} />
        </div>
    );
}
