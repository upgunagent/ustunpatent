'use client';

import { LucideTrash2 } from "lucide-react";
import { deleteSession } from "./actions";
import { useTransition } from "react";

interface DeleteButtonProps {
    sessionId: string;
    customerName: string;
}

export function DeleteButton({ sessionId, customerName }: DeleteButtonProps) {
    const [isPending, startTransition] = useTransition();

    const handleDelete = async () => {
        if (confirm(`${customerName} (ID: ${sessionId.substring(0, 8)}...) adlı görüşmeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
            startTransition(async () => {
                await deleteSession(sessionId);
            });
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-input bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 transition-colors"
            title="Görüşmeyi Sil"
        >
            <LucideTrash2 size={14} />
        </button>
    );
}
