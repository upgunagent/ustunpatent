import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
    const url = 'https://qmotrqehdzebojdowuol.supabase.co';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM';

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
    );
}
