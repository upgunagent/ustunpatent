import { NextResponse } from 'next/server';

export async function GET() {
    const SUPABASE_URL = 'https://qmotrqehdzebojdowuol.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODIzMjkyNCwiZXhwIjoyMDgzODA4OTI0fQ.16JVBPAn3YTXZm5V5wQ0ISo3JR5nnLVtnc74XHyyxmM'.trim();

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/n8n_chat_histories?select=count&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
            cache: 'no-store'
        });

        const status = res.status;
        const text = await res.text();

        return NextResponse.json({
            status,
            text,
            headers: {
                apikey: SUPABASE_KEY.substring(0, 10) + '...',
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
