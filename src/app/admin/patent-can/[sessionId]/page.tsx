import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils"; // We need to create this or import clsx directly
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

export default async function ChatDetailPage({
    params,
}: {
    params: Promise<{ sessionId: string }>; // Ensure params is a Promise as per Next.js 15
}) {
    const { sessionId } = await params;
    const supabase = createAdminClient();

    const { data: messages, error } = await supabase
        .from("n8n_chat_histories")
        .select("*")
        .eq("session_id", sessionId)
        .order("id", { ascending: true });

    if (error) {
        return <div>Error: {error.message}</div>;
    }

    return (
        <div className="flex h-[calc(100vh-10rem)] flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
                <div>
                    <h2 className="text-lg font-semibold">Görüşme Detayı</h2>
                    <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border bg-secondary/20 p-4 space-y-4">
                {messages?.map((msg) => {
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

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex w-full max-w-3xl",
                                isHuman ? "ml-auto justify-end" : "mr-auto"
                            )}
                        >
                            <div
                                className={cn(
                                    "rounded-lg px-4 py-2 text-sm shadow-sm",
                                    isHuman
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-background border"
                                )}
                            >
                                <div className="mb-1 text-xs opacity-70">
                                    {isHuman ? "Müşteri" : "PatentCan"}
                                </div>
                                <div className="whitespace-pre-wrap">{content}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
