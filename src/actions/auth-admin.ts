'use server';

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./mail";

export async function requestPasswordResetOTP(email: string) {
    const supabase = createAdminClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://ustunpatent.vercel.app';

    // 1. Generate 6-digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Generate Recovery Link (Hidden)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
            redirectTo: `${origin}/auth/callback?next=/panel/change-password`
        }
    });

    if (linkError) {
        console.error("Generate Link Error:", linkError);
        return { success: false, message: `Link oluşturulamadı: ${linkError.message}` };
    }

    const hiddenLink = linkData.properties.action_link;

    // 3. Store OTP + Link Mapping in `auth_otp_codes`
    const { error: dbError } = await supabase
        .from('auth_otp_codes')
        .insert({
            email: email,
            code: otp,
            redirect_url: hiddenLink
        });

    if (dbError) {
        console.error("DB Insert Error:", dbError);
        // If table doesn't exist, we fallback or fail.
        if (dbError.code === '42P01') {
            return { success: false, message: 'Sistem hatası: Tablo eksik. Lütfen yetkiliye bildirin (SQL Run).' };
        }
        return { success: false, message: 'Kod oluşturulamadı.' };
    }

    // 4. Send Email with Code
    const emailContent = `
Merhabalar,

Şifre sıfırlama talebiniz için doğrulama kodunuz aşağıdadır:

${otp}

Bu kodu ilgili alana girerek şifrenizi sıfırlayabilirsiniz.
Kod 15 dakika süreyle geçerlidir.

Saygılarımızla,
Üstün Patent
    `;

    const result = await sendEmail(
        email,
        "Şifre Sıfırlama Kodu",
        emailContent
    );

    if (!result.success) {
        return { success: false, message: `Mail gönderilemedi: ${result.message}` };
    }

    return { success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi.' };
}

export async function verifyOTP(email: string, code: string) {
    const supabase = createAdminClient();

    // 1. Check Code
    const { data, error } = await supabase
        .from('auth_otp_codes')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !data) {
        return { success: false, message: 'Kod geçersiz veya süresi dolmuş.' };
    }

    // 2. Delete used code (Security)
    await supabase.from('auth_otp_codes').delete().eq('id', data.id);

    // 3. Return the hidden link
    return { success: true, redirectUrl: data.redirect_url };
}

