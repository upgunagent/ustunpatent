import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LucidePlus, LucideBuilding2, LucideUser, LucideArrowRight } from "lucide-react";
import SearchInput from "@/components/ui/search-input";
import CopyableText from "@/components/ui/copyable-text";
import { getAgencySettings } from "@/actions/settings";
import ConsultantFilter from "@/components/firms/ConsultantFilter";

export const dynamic = 'force-dynamic';

export default async function FirmsPage({ searchParams }: { searchParams: Promise<{ q?: string; representative?: string }> }) {
    const supabase = await createClient();
    const { q: query, representative } = await searchParams;
    const settings = await getAgencySettings();

    let dbQuery = supabase
        .from("firms")
        .select("*")
        .order("created_at", { ascending: false });

    if (query) {
        const q = query.trim();
        dbQuery = dbQuery.or(`corporate_title.ilike.%${q}%,individual_name_surname.ilike.%${q}%,tpmk_owner_no.ilike.%${q}%`);
    }

    if (representative) {
        dbQuery = dbQuery.eq('representative', representative);
    }

    const { data: firms, error } = await dbQuery;

    if (error) {
        console.error("Error fetching firms:", error);
        return <div>Firmalar yüklenirken bir hata oluştu.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-bold">Firmalar</h1>
                <div className="flex items-center gap-4 flex-1 justify-end">
                    <ConsultantFilter consultants={settings.consultants} />
                    <SearchInput placeholder="Firma Adı veya Sahip No ile ara..." />
                    <Link
                        href="/panel/firms/new"
                        className="flex items-center gap-2 rounded-lg bg-[#001a4f] px-4 py-2 text-sm font-medium text-white hover:bg-[#002366] transition-colors shrink-0"
                    >
                        <LucidePlus size={18} />
                        Yeni Firma Ekle
                    </Link>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                        <tr>
                            <th className="px-6 py-3">Firma / Kişi Adı</th>
                            <th className="px-6 py-3">Müşteri Temsilcisi</th>
                            <th className="px-6 py-3">TPMK Sahip No</th>
                            <th className="px-6 py-3">Tür</th>
                            <th className="px-6 py-3">Yetkili</th>
                            <th className="px-6 py-3">Telefon</th>
                            <th className="px-6 py-3">E-posta</th>
                            <th className="px-6 py-3">Sektör</th>
                            <th className="px-6 py-3 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {firms && firms.length > 0 ? (
                            firms.map((firm) => (
                                <tr key={firm.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        <CopyableText text={firm.type === 'corporate' ? firm.corporate_title : firm.individual_name_surname || firm.name} />
                                    </td>
                                    <td className="px-6 py-4">
                                        {firm.representative || '-'}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-600">
                                        <CopyableText text={firm.tpmk_owner_no || '-'} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${firm.type === 'corporate'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-green-100 text-green-800'
                                            }`}>
                                            {firm.type === 'corporate' ? <LucideBuilding2 size={12} /> : <LucideUser size={12} />}
                                            {firm.type === 'corporate' ? 'Tüzel' : 'Şahıs'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <CopyableText text={firm.type === 'corporate' ? firm.corporate_authorized_person : firm.individual_name_surname || '-'} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <CopyableText text={firm.phone || '-'} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <CopyableText text={firm.email || '-'} />
                                    </td>
                                    <td className="px-6 py-4">{firm.sector}</td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/panel/firms/${firm.id}`}
                                            className="inline-flex items-center gap-1 rounded bg-[#001a4f] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#002366]"
                                        >
                                            Detay
                                            <LucideArrowRight size={12} />
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                                    {query ? 'Arama kriterlerine uygun firma bulunamadı.' : 'Henüz kayıtlı firma bulunmamaktadır.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
