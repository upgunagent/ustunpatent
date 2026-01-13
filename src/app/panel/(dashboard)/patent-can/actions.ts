'use server';

import { httpsDelete } from "@/lib/https-client";
import { revalidatePath } from "next/cache";

export async function deleteSession(sessionId: string) {
    // Service Role Key from admin.ts
    const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
    const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM';

    try {
        const res = await httpsDelete(`${SUPABASE_URL}/rest/v1/n8n_chat_histories?session_id=eq.${sessionId}`, {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        });

        if (res.status >= 200 && res.status < 300) {
            revalidatePath('/panel/patent-can');
            return { success: true };
        } else {
            console.error('Delete failed:', await res.text());
            return { success: false, error: 'Failed to delete' };
        }
    } catch (e) {
        console.error('Delete error:', e);
        return { success: false, error: 'Connection error' };
    }
}
