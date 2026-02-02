import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data: list } = await supabase.auth.admin.listUsers();
        const testUser = list.users.find(u => u.email === 'testlogin@ustunpatent.com');

        if (testUser) {
            await supabase.auth.admin.deleteUser(testUser.id);
            return NextResponse.json({ message: 'Deleted test user' });
        }

        return NextResponse.json({ message: 'Test user not found' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
