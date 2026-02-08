import FirmForm from "@/components/firms/FirmForm";
import Link from "next/link";
import { LucideArrowLeft } from "lucide-react";
import { getAgencySettings } from "@/actions/settings";

export default async function NewFirmPage() {
    const settings = await getAgencySettings();

    return (
        <div className="space-y-6">
            <Link
                href="/panel/firms"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#001a4f] transition-colors"
            >
                <LucideArrowLeft size={16} />
                Firmalar Listesine Dön
            </Link>

            <div className="max-w-5xl mx-auto">
                <FirmForm consultants={settings.consultants} />
            </div>
        </div>
    );
}
