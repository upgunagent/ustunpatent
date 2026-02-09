'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createFirm(formData: FormData) {
    const supabase = await createClient();

    const type = formData.get('type') as string;

    // Common fields
    const newFirm: any = {
        name: formData.get('name'),
        authority_name: formData.get('authority_name'),
        phone: formData.get('phone'),
        tpmk_owner_no: formData.get('tpmk_owner_no'),
        email: formData.get('email'),
        website: formData.get('website'),
        representative: formData.get('representative'),
        sector: formData.get('sector'),
        type: type,
    };

    if (type === 'individual') {
        newFirm.individual_name_surname = formData.get('individual_name_surname');
        newFirm.individual_tc = formData.get('individual_tc');
        newFirm.individual_born_date = formData.get('individual_born_date') || null;
        newFirm.individual_address = formData.get('individual_address');
    } else {
        newFirm.corporate_title = formData.get('corporate_title');
        newFirm.corporate_tax_office = formData.get('corporate_tax_office');
        newFirm.corporate_tax_number = formData.get('corporate_tax_number');
        newFirm.corporate_authorized_person = formData.get('corporate_authorized_person');
        newFirm.corporate_address = formData.get('corporate_address');
    }

    const { data, error } = await supabase
        .from('firms')
        .insert(newFirm)
        .select('id')
        .single();

    if (error) {
        console.error('Error creating firm:', error);
        throw new Error('Firma oluşturulurken bir hata oluştu: ' + error.message);
    }

    revalidatePath('/panel/firms');
    redirect(`/panel/firms/${data.id}`);
}

export async function addTrademark(formData: FormData) {
    const supabase = await createClient();

    const firmId = formData.get('firm_id') as string;

    // Handle logo upload
    let logoUrl = formData.get('logo_url') as string; // Fallback for old URL input if needed, or null
    const logoFile = formData.get('logo_file') as File;

    if (logoFile && logoFile.size > 0) {
        // Create a unique file path: firms/{firmId}/{timestamp}-filename
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `firms/${firmId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('firm-logos')
            .upload(filePath, logoFile, {
                upsert: false,
            });

        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            throw new Error('Logo yüklenirken bir hata oluştu: ' + uploadError.message);
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('firm-logos')
            .getPublicUrl(filePath);

        logoUrl = publicUrl;
    }

    const newTrademark = {
        firm_id: firmId,
        watch_agreement: formData.get('watch_agreement') === 'on',
        logo_url: logoUrl,
        name: formData.get('name'),
        rights_owner: formData.get('rights_owner'),
        application_no: formData.get('application_no'),
        classes: formData.get('classes'), // Capture selected classes
        start_bulletin_no: formData.get('start_bulletin_no'),
        watch_start_date: formData.get('watch_start_date') || null,
        watch_end_date: formData.get('watch_end_date') || null,
        registration_date: formData.get('registration_date') || null,
        registration_no: formData.get('registration_no') || null,
        consultant_name: (await getFirm(firmId))?.representative,
        search_keywords: formData.get('search_keywords'), // Add search keywords
    };

    const { error } = await supabase
        .from('firm_trademarks')
        .insert(newTrademark);

    if (error) {
        console.error('Error adding trademark:', error);
        throw new Error('Marka eklenirken bir hata oluştu: ' + error.message);
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true };
}

export async function updateTrademark(formData: FormData) {
    const supabase = await createClient();

    const id = formData.get('trademark_id') as string;
    const firmId = formData.get('firm_id') as string;

    // Handle logo upload
    let logoUrl = formData.get('logo_url') as string;
    const logoFile = formData.get('logo_file') as File;

    if (logoFile && logoFile.size > 0) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `firms/${firmId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('firm-logos')
            .upload(filePath, logoFile, {
                upsert: false,
            });

        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            throw new Error('Logo yüklenirken bir hata oluştu: ' + uploadError.message);
        }

        const { data: { publicUrl } } = supabase.storage
            .from('firm-logos')
            .getPublicUrl(filePath);

        logoUrl = publicUrl;
    }

    const updatedTrademark = {
        watch_agreement: formData.get('watch_agreement') === 'on',
        logo_url: logoUrl,
        name: formData.get('name'),
        rights_owner: formData.get('rights_owner'),
        application_no: formData.get('application_no'),
        classes: formData.get('classes'),
        start_bulletin_no: formData.get('start_bulletin_no'),
        watch_start_date: formData.get('watch_start_date') || null,
        watch_end_date: formData.get('watch_end_date') || null,
        registration_date: formData.get('registration_date') || null,
        registration_no: formData.get('registration_no') || null,
        consultant_name: (await getFirm(firmId))?.representative,
        search_keywords: formData.get('search_keywords'), // Add search keywords
    };

    const { error } = await supabase
        .from('firm_trademarks')
        .update(updatedTrademark)
        .eq('id', id);

    if (error) {
        console.error('Error updating trademark:', error);
        throw new Error('Marka güncellenirken bir hata oluştu: ' + error.message);
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true };
}

export async function updateFirm(firmId: string, data: any) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('firms')
        .update(data)
        .eq('id', firmId);

    if (error) {
        console.error('Error updating firm:', error);
        throw new Error('Firma güncellenirken bir hata oluştu: ' + error.message);
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true };
}

export async function getFirmsForSelect(query: string = '') {
    const supabase = await createClient();

    let dbQuery = supabase
        .from('firms')
        .select('id, name, corporate_title, individual_name_surname, tpmk_owner_no')
        .order('created_at', { ascending: false })
        .limit(20);

    if (query) {
        const q = query.trim();
        dbQuery = dbQuery.or(`corporate_title.ilike.%${q}%,individual_name_surname.ilike.%${q}%,tpmk_owner_no.ilike.%${q}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
        console.error('Error fetching firms for select:', error);
        return [];
    }

    return data.map(firm => ({
        id: firm.id,
        label: firm.corporate_title || firm.individual_name_surname || firm.name,
        subLabel: firm.tpmk_owner_no
    }));
}

export async function getFirmTrademarks(firmId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('firm_trademarks')
        .select('*')
        .eq('firm_id', firmId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching firm trademarks:', error);
        return [];
    }

    return data;
}

export async function getFirm(firmId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('firms')
        .select('*')
        .eq('id', firmId)
        .single();

    if (error) {
        console.error('Error fetching firm:', error);
        return null;
    }

    return data;
}

export async function deleteFirmAction(actionId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('firm_actions')
        .delete()
        .eq('id', actionId);

    if (error) {
        console.error('Error deleting firm action:', error);
        return { success: false, message: 'İşlem silinirken hata oluştu.' };
    }

    revalidatePath('/panel/firms/[id]', 'page');
    return { success: true, message: 'İşlem başarıyla silindi.' };
}

export async function deleteTrademark(trademarkId: string, firmId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('firm_trademarks')
        .delete()
        .eq('id', trademarkId);

    if (error) {
        console.error('Error deleting trademark:', error);
        return { success: false, message: 'Marka silinirken hata oluştu.' };
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true, message: 'Marka başarıyla silindi.' };
}

export async function deleteFirm(firmId: string) {
    const supabase = await createClient();

    // 1. Delete Firm Actions
    const { error: actionsError } = await supabase
        .from('firm_actions')
        .delete()
        .eq('firm_id', firmId);

    if (actionsError) {
        console.error('Error deleting firm actions:', actionsError);
        return { success: false, message: 'Firma işlemleri silinirken hata oluştu.' };
    }

    // 2. Delete Firm Trademarks
    const { error: trademarksError } = await supabase
        .from('firm_trademarks')
        .delete()
        .eq('firm_id', firmId);

    if (trademarksError) {
        console.error('Error deleting firm trademarks:', trademarksError);
        return { success: false, message: 'Firma markaları silinirken hata oluştu.' };
    }

    // 3. Delete Firm
    const { error } = await supabase
        .from('firms')
        .delete()
        .eq('id', firmId);

    if (error) {
        console.error('Error deleting firm:', error);
        return { success: false, message: 'Firma silinirken hata oluştu: ' + error.message };
    }

    revalidatePath('/panel/firms');
    return { success: true, message: 'Firma ve tüm verileri başarıyla silindi.' };
}
