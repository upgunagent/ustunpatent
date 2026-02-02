'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function createTestUser() {
    const supabase = createAdminClient();
    const email = 'testlogin@ustunpatent.com';
    const password = 'TestPassword123!';

    // Delete if exists to be clean
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list.users.find(u => u.email === email);
    if (existing) {
        await supabase.auth.admin.deleteUser(existing.id);
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
    });

    if (error) return { success: false, message: 'Create failed: ' + error.message };
    return { success: true, message: 'Created test user' };
}

export async function testLogin() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'testlogin@ustunpatent.com',
        password: 'TestPassword123!'
    });

    if (error) return { success: false, message: 'Login failed: ' + error.message };
    return { success: true, message: 'Login successful! Session user: ' + data.user.email };
}
