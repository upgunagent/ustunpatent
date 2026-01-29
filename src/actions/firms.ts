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
        consultant_name: formData.get('consultant_name'),
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
        consultant_name: formData.get('consultant_name'),
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
