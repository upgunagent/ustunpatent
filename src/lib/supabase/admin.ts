import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
        console.error("CRITICAL ERROR: SUPABASE_SERVICE_ROLE_KEY is missing/undefined in process.env!");
    } else {
        console.log("Admin Client Init: Key found (First 10 chars):", serviceKey.substring(0, 10));
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}
