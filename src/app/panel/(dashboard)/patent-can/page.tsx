import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { tr } from "date-fns/locale/tr";
import { cleanContent } from "@/lib/chat-utils";
import { DeleteButton } from "./delete-button";

interface ChatMessage {
    id: number;
    session_id: string;
    message: {
        type: string;
        content: string;
        additional_kwargs?: any;
    };
}

import { httpsGet } from '@/lib/https-client';

export default async function PatentCanPage() {
    // Bypass supabase-js client due to environment issues
    const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3RycWVoZHplYm9qZG93dW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzI5MjQsImV4cCI6MjA4MzgwODkyNH0.tRCTYAcMOSWA1z_TSk4-HwyS74f1s01lYfIDO_NV_Ls';

    let messages: ChatMessage[] = [];
    let error = null;

    try {
        const res = await httpsGet(`${SUPABASE_URL}/rest/v1/n8n_chat_histories?select=*&order=id.desc`, {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        });

        if (res.status >= 200 && res.status < 300) {
            messages = await res.json();
        } else {
            const text = await res.text();
            return (
                <div className="p-4 text-destructive">
                    Error loading chats: {res.status} {res.statusText} - {text}
                </div>
            );
        }
    } catch (e: any) {
        return (
            <div className="p-4 text-destructive">
                Connection Error for chats: {e.message}
            </div>
        );
    }

    // Deduplicate sessions and find earliest message for renaming
    const sessionMap = new Map<string, { latestMsg: ChatMessage, firstMsgId: number }>();

    // First pass: find first/last message for each session
    messages?.forEach((msg: ChatMessage) => {
        const current = sessionMap.get(msg.session_id);

        if (!current) {
            sessionMap.set(msg.session_id, {
                latestMsg: msg,
                firstMsgId: msg.id
            });
        } else {
            // Since messages are ordered ID DESC, first one we see is latest.
            // But we encounter older ones later in loop.
            if (msg.id < current.firstMsgId) {
                current.firstMsgId = msg.id;
            }
            // 'latestMsg' is already set to the one with highest ID (first seen)
        }
    });

    // Determine "Customer Number" based on firstMsgId (Oldest = 1)
    const sortedByTime = Array.from(sessionMap.entries()).sort((a, b) =>
        a[1].firstMsgId - b[1].firstMsgId
    );

    const sessionToName = new Map<string, string>();
    sortedByTime.forEach((entry, index) => {
        sessionToName.set(entry[0], `Müşteri-${index + 1}`);
    });

    // Prepare list for display (Sort by latest activity DESC)
    const sessionList = Array.from(sessionMap.values()).map(val => ({
        ...val.latestMsg,
        customerName: sessionToName.get(val.latestMsg.session_id) || "Bilinmeyen Müşteri"
    })).sort((a, b) => b.id - a.id);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">PatentCan Görüşmeleri</h1>
            <div className="rounded-md border bg-card text-card-foreground shadow-sm">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[200px]">
                                    Müşteri
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Son Mesaj
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">
                                    İşlem
                                </th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {sessionList.map((session) => {
                                let rawContent = "";
                                try {
                                    rawContent = typeof session.message.content === 'string'
                                        ? session.message.content
                                        : JSON.stringify(session.message.content);
                                } catch (e) {
                                    rawContent = "Error parsing content";
                                }

                                const previewContent = cleanContent(rawContent);

                                return (
                                    <tr
                                        key={session.session_id}
                                        className="border-b transition-colors hover:bg-muted/50"
                                    >
                                        <td className="p-4 align-middle font-medium">
                                            {session.customerName}
                                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-50">
                                                {session.session_id.substring(0, 8)}...
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div
                                                className="line-clamp-2 max-w-md text-muted-foreground"
                                                dangerouslySetInnerHTML={{ __html: previewContent }}
                                            />
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <div className="flex justify-end gap-2">
                                                <DeleteButton
                                                    sessionId={session.session_id}
                                                    customerName={session.customerName}
                                                />
                                                <Link
                                                    href={`/panel/patent-can/${session.session_id}?customerTitle=${encodeURIComponent(session.customerName)}`}
                                                    className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                                >
                                                    Görüntüle
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                    {sessionList.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            Henüz görüşme kaydı bulunmuyor.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
