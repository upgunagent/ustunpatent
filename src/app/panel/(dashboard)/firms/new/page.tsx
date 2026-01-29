import FirmForm from "@/components/firms/FirmForm";
import Link from "next/link";
import { LucideArrowLeft } from "lucide-react";

export default function NewFirmPage() {
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
                <FirmForm />
            </div>
        </div>
    );
}
