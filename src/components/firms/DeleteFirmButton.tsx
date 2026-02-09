'use client';

import { LucideTrash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteFirmButtonProps {
    firmId: string;
}

export default function DeleteFirmButton({ firmId }: DeleteFirmButtonProps) {
    return (
        <button
            onClick={async () => {
                if (!confirm('BU FİRMAYI TAMAMEN SİLMEK İSTEDİĞİNİZE EMİN MİSİNİZ? \n\nBu işlem geri alınamaz ve firmaya ait tüm markalar, işlemler ve dosyalar silinecektir.')) return;

                const { deleteFirm } = await import('@/actions/firms');
                const result = await deleteFirm(firmId);

                if (result.success) {
                    toast.success(result.message);
                    // Redirect to firms list is handled by server action revalidatePath usually, 
                    // but for client-side navigation after delete we can force it or let the action redirect if it could.
                    // Since the action revalidates '/panel/firms', we might need to manually navigate if we are on the deleted page.
                    window.location.href = '/panel/firms';
                } else {
                    toast.error(result.message);
                }
            }}
            className="flex items-center gap-2 rounded-lg bg-red-600/90 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
        >
            <LucideTrash2 size={16} />
            Firmayı Sil
        </button>
    );
}
