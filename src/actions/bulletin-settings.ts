'use server';

import { createClient } from '@/lib/supabase/server';

export async function getBulletinStats(bulletinNo: string) {
    if (!bulletinNo) return { count: 0, logoCount: 0 };
    
    const supabase = await createClient();
    
    // Get record count
    const { count, error } = await supabase
        .from('bulletin_marks')
        .select('*', { count: 'exact', head: true })
        .eq('issue_no', bulletinNo);
    
    if (error) {
        console.error('Stats error:', error);
        return { count: 0, logoCount: 0 };
    }

    // Get logo count (records with non-null logo_url)
    const { count: logoCount } = await supabase
        .from('bulletin_marks')
        .select('*', { count: 'exact', head: true })
        .eq('issue_no', bulletinNo)
        .not('logo_url', 'is', null);

    return { count: count || 0, logoCount: logoCount || 0 };
}

export async function deleteBulletinData(bulletinNo: string, password: string) {
    if (!bulletinNo || !password) {
        return { success: false, message: 'Bülten numarası ve şifre gereklidir.' };
    }

    const supabase = await createClient();

    // 1. Verify password by getting current user email and re-authenticating
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
        return { success: false, message: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
    });

    if (authError) {
        return { success: false, message: 'Şifre hatalı! Lütfen doğru şifreyi girin.' };
    }

    // 2. Delete logo files from storage FIRST (before DB records are gone)
    //    Use storage list API to find all files in the bulletin folder
    let deletedLogos = 0;
    const BUCKET = 'mark_logos';

    // Helper: recursively list and delete all files in a folder
    async function deleteFolder(folderPath: string) {
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            const { data: files, error: listError } = await supabase.storage
                .from(BUCKET)
                .list(folderPath, { limit, offset });

            if (listError || !files || files.length === 0) {
                hasMore = false;
                break;
            }

            // Separate files and sub-folders
            const filePaths: string[] = [];
            const subFolders: string[] = [];

            for (const file of files) {
                // Folders have no metadata/id in some cases, check name
                if (file.id) {
                    // It's a file
                    filePaths.push(`${folderPath}/${file.name}`);
                } else {
                    // It's a sub-folder — recurse
                    subFolders.push(`${folderPath}/${file.name}`);
                }
            }

            // Delete files in this batch
            if (filePaths.length > 0) {
                const { error: delError } = await supabase.storage
                    .from(BUCKET)
                    .remove(filePaths);

                if (!delError) {
                    deletedLogos += filePaths.length;
                } else {
                    console.error('Storage delete error:', delError);
                }
            }

            // Recurse into sub-folders
            for (const sub of subFolders) {
                await deleteFolder(sub);
            }

            if (files.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
            }
        }
    }

    // Try direct folder: mark_logos/{bulletinNo}/
    await deleteFolder(bulletinNo);

    // 3. Delete all records from bulletin_marks table
    const { error: deleteError, count } = await supabase
        .from('bulletin_marks')
        .delete({ count: 'exact' })
        .eq('issue_no', bulletinNo);

    if (deleteError) {
        return { success: false, message: `Kayıt silme hatası: ${deleteError.message}` };
    }

    return {
        success: true,
        message: `Bülten ${bulletinNo} başarıyla silindi. ${count || 0} kayıt ve ${deletedLogos} logo silindi.`,
        deletedRecords: count || 0,
        deletedLogos
    };
}
