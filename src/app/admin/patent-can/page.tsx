import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { tr } from "date-fns/locale/tr";

interface ChatMessage {
    id: number;
    session_id: string;
    message: {
        type: string;
        content: string;
        additional_kwargs?: any;
    };
}

export default async function PatentCanPage() {
    const supabase = createAdminClient();

    // Fetch all messages (optimization: limit or paginate in future)
    const { data: messages, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        return (
            <div className="p-4 text-destructive">
                Error loading chats: {error.message}
            </div>
        );
    }

    // Deduplicate sessions
    const sessions = new Map<string, ChatMessage>();
    messages?.forEach((msg: ChatMessage) => {
        if (!sessions.has(msg.session_id)) {
            sessions.set(msg.session_id, msg);
        }
    });

    const sessionList = Array.from(sessions.values());

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">PatentCan Görüşmeleri</h1>
            <div className="rounded-md border bg-card text-card-foreground shadow-sm">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Session ID
                                </th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                    Son Mesaj
                                </th>
                                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                    İşlem
                                </th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {sessionList.map((session) => (
                                <tr
                                    key={session.session_id}
                                    className="border-b transition-colors hover:bg-muted/50"
                                >
                                    <td className="p-4 align-middle font-mono text-xs">
                                        {session.session_id.substring(0, 12)}...
                                    </td>
                                    <td className="p-4 align-middle">
                                        <div className="line-clamp-1 max-w-md text-muted-foreground">
                                            {typeof session.message.content === 'string'
                                                ? session.message.content
                                                : JSON.stringify(session.message.content)}
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle text-right">
                                        <Link
                                            href={`/admin/patent-can/${session.session_id}`}
                                            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                                        >
                                            Görüntüle
                                        </Link>
                                    </td>
                                </tr>
                            ))}
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
