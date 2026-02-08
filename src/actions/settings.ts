'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Data Types
export type AgencyData = {
    settings: {
        id: string;
        firm_name: string | null;
        email: string | null;
        tax_office: string | null;
        tax_number: string | null;
    };
    phones: { id: string; phone_number: string }[];
    addresses: { id: string; address: string }[];
    bankAccounts: { id: string; bank_name: string; account_name: string | null; iban: string }[];
    consultants: { id: string; name: string; title: string | null; email: string | null; phone: string | null }[];
};

export async function getAgencySettings(): Promise<AgencyData> {
    const supabase = await createClient();

    // 1. Get or Create Settings (Singleton)
    let { data: settings, error } = await supabase
        .from('agency_settings')
        .select('*')
        .single();

    if (error && error.code === 'PGRST116') {
        // No row found, create one
        const { data: newSettings, error: createError } = await supabase
            .from('agency_settings')
            .insert({})
            .select()
            .single();

        if (createError) throw new Error(createError.message);
        settings = newSettings;
    } else if (error) {
        throw new Error(error.message);
    }

    const agencyId = settings.id;

    // 2. Fetch related data in parallel
    const [phones, addresses, bankAccounts, consultants] = await Promise.all([
        supabase.from('agency_phones').select('*').eq('agency_id', agencyId),
        supabase.from('agency_addresses').select('*').eq('agency_id', agencyId),
        supabase.from('agency_bank_accounts').select('*').eq('agency_id', agencyId),
        supabase.from('agency_consultants').select('*').eq('agency_id', agencyId)
    ]);

    return {
        settings: settings,
        phones: phones.data || [],
        addresses: addresses.data || [],
        bankAccounts: bankAccounts.data || [],
        consultants: consultants.data || []
    };
}

// --- Update Main Settings ---
export async function updateAgencySettings(
    formData: { firm_name: string; email: string; tax_office: string; tax_number: string }
) {
    const supabase = await createClient();

    // Get ID first
    const { data: current } = await supabase.from('agency_settings').select('id').single();
    if (!current) throw new Error("Agency settings not initialized");

    const { error } = await supabase
        .from('agency_settings')
        .update(formData)
        .eq('id', current.id);

    if (error) throw new Error(error.message);
    revalidatePath('/panel/settings');
    return { success: true };
}

// --- Phones ---
export async function addAgencyPhone(phoneNumber: string) {
    const supabase = await createClient();
    const { data: current } = await supabase.from('agency_settings').select('id').single();
    if (!current) throw new Error("Settings not found");

    const { error } = await supabase.from('agency_phones').insert({
        agency_id: current.id,
        phone_number: phoneNumber
    });
    if (error) throw new Error(error.message);
    revalidatePath('/panel/settings');
}

export async function removeAgencyPhone(id: string) {
    const supabase = await createClient();
    await supabase.from('agency_phones').delete().eq('id', id);
    revalidatePath('/panel/settings');
}

// --- Addresses ---
export async function addAgencyAddress(address: string) {
    const supabase = await createClient();
    const { data: current } = await supabase.from('agency_settings').select('id').single();
    if (!current) throw new Error("Settings not found");

    const { error } = await supabase.from('agency_addresses').insert({
        agency_id: current.id,
        address: address
    });
    if (error) throw new Error(error.message);
    revalidatePath('/panel/settings');
}

export async function removeAgencyAddress(id: string) {
    const supabase = await createClient();
    await supabase.from('agency_addresses').delete().eq('id', id);
    revalidatePath('/panel/settings');
}

// --- Bank Accounts ---
export async function addAgencyBankAccount(bankName: string, accountName: string, iban: string) {
    const supabase = await createClient();
    const { data: current } = await supabase.from('agency_settings').select('id').single();
    if (!current) throw new Error("Settings not found");

    const { error } = await supabase.from('agency_bank_accounts').insert({
        agency_id: current.id,
        bank_name: bankName,
        account_name: accountName,
        iban: iban
    });
    if (error) throw new Error(error.message);
    revalidatePath('/panel/settings');
}

export async function removeAgencyBankAccount(id: string) {
    const supabase = await createClient();
    await supabase.from('agency_bank_accounts').delete().eq('id', id);
    revalidatePath('/panel/settings');
}

// --- Consultants ---
export async function addAgencyConsultant(data: { name: string; title: string; email: string; phone: string }) {
    const supabase = await createClient();
    const { data: current } = await supabase.from('agency_settings').select('id').single();
    if (!current) throw new Error("Settings not found");

    const { error } = await supabase.from('agency_consultants').insert({
        agency_id: current.id,
        ...data
    });
    if (error) throw new Error(error.message);
    revalidatePath('/panel/settings');
}


export async function removeAgencyConsultant(id: string) {
    const supabase = await createClient();
    await supabase.from('agency_consultants').delete().eq('id', id);
    revalidatePath('/panel/settings');
}

export async function updateAgencyConsultant(id: string, data: { name: string; title: string; email: string; phone: string }) {
    const supabase = await createClient();
    const { error } = await supabase
        .from('agency_consultants')
        .update(data)
        .eq('id', id);

    if (error) throw new Error(error.message);
    revalidatePath('/panel/settings');
}
