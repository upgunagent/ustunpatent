'use server';

import { httpsDelete } from "@/lib/https-client";
import { revalidatePath } from "next/cache";

export async function deleteSession(sessionId: string) {
    const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
    // Using Anon Key (Proven working in page.tsx)
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtb3RycWVoZHplYm9qZG93dW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMzI5MjQsImV4cCI6MjA4MzgwODkyNH0.tRCTYAcMOSWA1z_TSk4-HwyS74f1s01lYfIDO_NV_Ls';

    try {
        console.log('Attempting to delete session (https):', sessionId);

        const url = `${SUPABASE_URL}/rest/v1/n8n_chat_histories?session_id=eq.${sessionId}`;

        const res = await httpsDelete(url, {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,count=exact'
        });

        if (res.status >= 200 && res.status < 300) {
            const result = await res.json();
            const deletedCount = Array.isArray(result) ? result.length : 0;

            if (deletedCount === 0) {
                return {
                    success: false,
                    error: `Silinmedi! ID: '${sessionId}' eşleşmedi. (Rows: 0)`
                };
            }

            revalidatePath('/panel/patent-can');
            return { success: true, message: `Başarılı! ${deletedCount} kayıt silindi.` };
        } else {
            const text = await res.text();
            console.error('Delete failed:', res.status, text);
            return { success: false, error: `API Error: ${res.status} ${text}` };
        }

    } catch (e: any) {
        console.error('Delete error:', e);
        return { success: false, error: 'Connection Error: ' + e.message };
    }
}
