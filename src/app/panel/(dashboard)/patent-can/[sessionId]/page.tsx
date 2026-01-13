import { httpsGet } from "@/lib/https-client";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { cleanContent, extractDateFromContent } from "@/lib/chat-utils";
import Image from "next/image";

function cn(...classes: (string | undefined | null | false)[]) {
    return twMerge(clsx(classes));
}

export default async function ChatDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ sessionId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { sessionId } = await params;
    const sp = await searchParams; // Wait for search params
    const customerTitle = typeof sp.customerTitle === 'string' ? sp.customerTitle : 'Görüşme Detayı';

    // Use Anon Key as workaround
    const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3RycWVoZHplYm9qZG93dW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzI5MjQsImV4cCI6MjA4MzgwODkyNH0.tRCTYAcMOSWA1z_TSk4-HwyS74f1s01lYfIDO_NV_Ls';

    let messages: any[] = [];
    let error = null;

    try {
        const res = await httpsGet(`${SUPABASE_URL}/rest/v1/n8n_chat_histories?session_id=eq.${sessionId}&select=*&order=id.asc`, {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        });

        if (res.status >= 200 && res.status < 300) {
            messages = await res.json();
        } else {
            const text = await res.text();
            error = { message: `${res.status} ${res.statusText} - ${text}` };
        }
    } catch (e: any) {
        error = { message: e.message };
    }

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-lg font-semibold">{customerTitle}</h2>
                    <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border bg-secondary/20 p-4 space-y-4 shadow-inner">
                {messages?.map((msg) => {
                    // DEBUG: Log message structure
                    console.log('Message Object:', JSON.stringify(msg, null, 2));

                    const isAi = msg.message.type === "ai";
                    const isHuman = msg.message.type === "human";

                    let content = "";
                    try {
                        content = typeof msg.message.content === 'string'
                            ? msg.message.content
                            : JSON.stringify(msg.message.content);
                    } catch (e) {
                        content = "Error parsing message";
                    }

                    // Try to extract date from content tags like [today=2026-01-13]
                    let dateStr = "";
                    const extractedDate = extractDateFromContent(content);

                    if (extractedDate) {
                        try {
                            // dateMatch[1] is 2026-01-13
                            const parsedDate = new Date(extractedDate);
                            if (!isNaN(parsedDate.getTime())) {
                                dateStr = format(parsedDate, 'dd/MM/yy');
                            } else {
                                dateStr = extractedDate;
                            }
                        } catch (e) {
                            dateStr = extractedDate;
                        }
                    } else if (msg.created_at) {
                        // Fallback if DB gets updated later
                        try {
                            dateStr = format(new Date(msg.created_at), 'dd/MM/yy HH:mm');
                        } catch (e) { }
                    }

                    const formattedContent = cleanContent(content);

                    // If content became empty after cleaning (e.g. only logs), skip or show placeholder?
                    if (!formattedContent && content.length > 0) return null;

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full mb-4",
                                isHuman ? "justify-end" : "justify-start"
                            )}
                        >
                            <div
                                className={cn(
                                    "rounded-2xl px-5 py-3 text-sm shadow-sm max-w-[80%]",
                                    isHuman
                                        ? "bg-blue-600 text-white rounded-br-none"
                                        : "bg-white border border-gray-100 text-gray-800 rounded-bl-none shadow-md"
                                )}
                            >
                                <div className={cn("flex justify-between items-center mb-1 text-xs opacity-80 gap-4 border-b border-opacity-20 pb-1", isHuman ? "border-white" : "border-gray-300")}>
                                    <div className="flex items-center gap-2">
                                        {!isHuman && (
                                            <div className="relative h-6 w-6 overflow-hidden rounded-full border border-gray-200">
                                                <Image
                                                    src="/ustun_avatar_balon.png"
                                                    alt="Bot Avatar"
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>
                                        )}
                                        <span className="font-semibold">{isHuman ? "Müşteri" : "PatentCan (AI)"}</span>
                                    </div>
                                    <span className="font-mono text-[10px]">{dateStr}</span>
                                </div>
                                <div
                                    className="whitespace-pre-wrap leading-relaxed mt-1"
                                    dangerouslySetInnerHTML={{ __html: formattedContent.replace(/\n/g, '<br />') }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
