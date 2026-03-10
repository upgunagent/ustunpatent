'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Type for contact data
export interface ContactData {
    full_name: string;
    tc_no?: string;
    tpmk_owner_no?: string;
    phones: string[];
    emails: string[];
}

export async function createFirm(formData: FormData) {
    const supabase = await createClient();

    const type = formData.get('type') as string;

    // Common fields
    const newFirm: any = {
        name: formData.get('name'),
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

    // Create contacts from JSON data
    const contactsJson = formData.get('contacts') as string;
    if (contactsJson) {
        try {
            const contacts: ContactData[] = JSON.parse(contactsJson);
            if (contacts.length > 0) {
                const contactRows = contacts.map(c => ({
                    firm_id: data.id,
                    full_name: c.full_name,
                    tc_no: c.tc_no || null,
                    tpmk_owner_no: c.tpmk_owner_no || null,
                    phones: c.phones.filter(Boolean),
                    emails: c.emails.filter(Boolean),
                }));

                const { error: contactError } = await supabase
                    .from('firm_contacts')
                    .insert(contactRows);

                if (contactError) {
                    console.error('Error creating contacts:', contactError);
                }
            }
        } catch (e) {
            console.error('Error parsing contacts JSON:', e);
        }
    }

    // Also set legacy fields from first contact for backward compat
    if (contactsJson) {
        try {
            const contacts: ContactData[] = JSON.parse(contactsJson);
            if (contacts.length > 0) {
                const first = contacts[0];
                await supabase.from('firms').update({
                    authority_name: first.full_name,
                    phone: first.phones[0] || null,
                    email: first.emails[0] || null,
                    tpmk_owner_no: first.tpmk_owner_no || null,
                }).eq('id', data.id);
            }
        } catch (e) { /* ignore */ }
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
        classes: formData.get('classes'),
        start_bulletin_no: formData.get('start_bulletin_no'),
        watch_start_date: formData.get('watch_start_date') || null,
        watch_end_date: formData.get('watch_end_date') || null,
        registration_date: formData.get('registration_date') || null,
        registration_no: formData.get('registration_no') || null,
        consultant_name: (await getFirm(firmId))?.representative,
        search_keywords: formData.get('search_keywords'),
    };

    const { data: trademarkData, error } = await supabase
        .from('firm_trademarks')
        .insert(newTrademark)
        .select('id')
        .single();

    if (error) {
        console.error('Error adding trademark:', error);
        throw new Error('Marka eklenirken bir hata oluştu: ' + error.message);
    }

    // Assign contacts to trademark
    const contactIdsJson = formData.get('contact_ids') as string;
    if (contactIdsJson && trademarkData) {
        try {
            const contactIds: string[] = JSON.parse(contactIdsJson);
            if (contactIds.length > 0) {
                const junctionRows = contactIds.map(cid => ({
                    trademark_id: trademarkData.id,
                    contact_id: cid,
                }));
                await supabase.from('firm_trademark_contacts').insert(junctionRows);
            }
        } catch (e) {
            console.error('Error assigning contacts to trademark:', e);
        }
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
        search_keywords: formData.get('search_keywords'),
    };

    const { error } = await supabase
        .from('firm_trademarks')
        .update(updatedTrademark)
        .eq('id', id);

    if (error) {
        console.error('Error updating trademark:', error);
        throw new Error('Marka güncellenirken bir hata oluştu: ' + error.message);
    }

    // Update contact assignments: delete old, insert new
    const contactIdsJson = formData.get('contact_ids') as string;
    if (contactIdsJson) {
        try {
            // Remove existing assignments
            await supabase.from('firm_trademark_contacts').delete().eq('trademark_id', id);

            const contactIds: string[] = JSON.parse(contactIdsJson);
            if (contactIds.length > 0) {
                const junctionRows = contactIds.map(cid => ({
                    trademark_id: id,
                    contact_id: cid,
                }));
                await supabase.from('firm_trademark_contacts').insert(junctionRows);
            }
        } catch (e) {
            console.error('Error updating trademark contacts:', e);
        }
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

    // 2. Delete Firm Contacts (cascade will handle trademark_contacts)
    const { error: contactsError } = await supabase
        .from('firm_contacts')
        .delete()
        .eq('firm_id', firmId);

    if (contactsError) {
        console.error('Error deleting firm contacts:', contactsError);
        return { success: false, message: 'Firma yetkilileri silinirken hata oluştu.' };
    }

    // 3. Delete Firm Trademarks
    const { error: trademarksError } = await supabase
        .from('firm_trademarks')
        .delete()
        .eq('firm_id', firmId);

    if (trademarksError) {
        console.error('Error deleting firm trademarks:', trademarksError);
        return { success: false, message: 'Firma markaları silinirken hata oluştu.' };
    }

    // 4. Delete Firm
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

// =============================================
// Firm Contacts CRUD
// =============================================

export async function getFirmContacts(firmId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('firm_contacts')
        .select('*')
        .eq('firm_id', firmId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching firm contacts:', error);
        return [];
    }

    return data;
}

export async function addFirmContact(firmId: string, contact: ContactData) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('firm_contacts')
        .insert({
            firm_id: firmId,
            full_name: contact.full_name,
            tc_no: contact.tc_no || null,
            tpmk_owner_no: contact.tpmk_owner_no || null,
            phones: contact.phones.filter(Boolean),
            emails: contact.emails.filter(Boolean),
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding firm contact:', error);
        return { success: false, message: 'Yetkili eklenirken hata oluştu: ' + error.message };
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true, data };
}

export async function updateFirmContact(contactId: string, firmId: string, contact: Partial<ContactData>) {
    const supabase = await createClient();

    const updateData: any = {};
    if (contact.full_name !== undefined) updateData.full_name = contact.full_name;
    if (contact.tc_no !== undefined) updateData.tc_no = contact.tc_no || null;
    if (contact.tpmk_owner_no !== undefined) updateData.tpmk_owner_no = contact.tpmk_owner_no || null;
    if (contact.phones !== undefined) updateData.phones = contact.phones.filter(Boolean);
    if (contact.emails !== undefined) updateData.emails = contact.emails.filter(Boolean);
    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('firm_contacts')
        .update(updateData)
        .eq('id', contactId);

    if (error) {
        console.error('Error updating firm contact:', error);
        return { success: false, message: 'Yetkili güncellenirken hata oluştu: ' + error.message };
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true };
}

export async function deleteFirmContact(contactId: string, firmId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('firm_contacts')
        .delete()
        .eq('id', contactId);

    if (error) {
        console.error('Error deleting firm contact:', error);
        return { success: false, message: 'Yetkili silinirken hata oluştu: ' + error.message };
    }

    revalidatePath(`/panel/firms/${firmId}`);
    return { success: true, message: 'Yetkili başarıyla silindi.' };
}

export async function getTrademarkContacts(trademarkId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('firm_trademark_contacts')
        .select('contact_id, firm_contacts(*)')
        .eq('trademark_id', trademarkId);

    if (error) {
        console.error('Error fetching trademark contacts:', error);
        return [];
    }

    return data?.map((d: any) => d.firm_contacts).filter(Boolean) || [];
}
