'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getFirmHistory(firmId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('firm_actions')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching history:", error);
        return [];
    }

    return data;
}

export async function updateActionStatus(actionId: string, newStatus: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('firm_actions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', actionId);

    if (error) {
        throw new Error('Durum güncellenemedi.');
    }

    revalidatePath('/panel/firms/[id]', 'page'); // Revalidate firm details page
    return { success: true };
}
