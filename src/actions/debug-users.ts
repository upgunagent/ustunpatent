'use server';

import { createAdminClient } from "@/lib/supabase/admin";

export async function listUsers() {
    const supabase = createAdminClient();
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("List Users Error:", error);
        return [];
    }

    return users.map(u => ({
        email: u.email,
        id: u.id,
        confirmed_at: u.email_confirmed_at,
        last_sign_in: u.last_sign_in_at,
        app_metadata: u.app_metadata,
        user_metadata: u.user_metadata
    }));
}
