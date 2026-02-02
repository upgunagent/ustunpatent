'use server';

import { createClient } from '@/lib/supabase/server';

// Generic Email Sender Helper
export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    attachments: { filename: string, content: string | Buffer }[] = [],
    html?: string
) {
    try {
        const nodemailer = require('nodemailer');

        const host = process.env.SMTP_HOST || 'smtp-mail.outlook.com'; // Fallback

        console.log("SMTP Config Check:", {
            host: host,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER ? '***' : 'MISSING',
            pass: process.env.SMTP_PASSWORD ? '***' : 'MISSING'
        });

        const transporter = nodemailer.createTransport({
            host: host,
            port: Number(process.env.SMTP_PORT),
            secure: false, // STARTTLS
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });

        console.log(`Sending email to ${to}...`);
        await transporter.sendMail({
            from: '"Üstün Patent" <web@ustunpatent.com>',
            to: to,
            subject: subject,
            text: text,
            html: html,
            attachments: attachments
        });

        return { success: true };
    } catch (error: any) {
        console.error("Mail Send Error:", error);
        return { success: false, message: error.message };
    }
}

// Specific Action for Trademark Notifications
export async function sendTrademarkNotification(
    firmId: string,
    emailContent: string,
    subject: string,
    attachmentData: { filename: string, content: string }[]
) {
    try {
        const supabase = await createClient();

        // 1. Fetch Firm Email
        console.log(`Fetching firm details for ID: ${firmId}`);
        const { data: firm, error: firmError } = await supabase
            .from('firms')
            .select('email')
            .eq('id', firmId)
            .single();

        if (firmError) {
            console.error('Supabase fetch error:', firmError);
            return { success: false, message: `DB Hatası: ${firmError.message}` };
        }

        if (!firm) {
            console.error('Firm not found for ID:', firmId);
            return { success: false, message: 'Firma bilgileri alınamadı (Kayıt bulunamadı).' };
        }

        // Prioritize registered email
        const toEmail = firm.email;
        if (!toEmail) {
            return { success: false, message: 'Firmaya ait kayıtlı e-posta adresi bulunamadı.' };
        }

        // 2. Process Attachments
        const attachments = attachmentData.map(item => ({
            filename: item.filename.endsWith('.pdf') ? item.filename : `${item.filename}.pdf`,
            content: Buffer.from(item.content, 'base64')
        }));

        // 3. Send Email using Helper
        const result = await sendEmail(toEmail, subject, emailContent, attachments);

        if (!result.success) {
            return { success: false, message: `Sunucu hatası: ${result.message}` };
        }

        // 4. Log to Database
        const { error: logError } = await supabase
            .from('firm_actions')
            .insert({
                firm_id: firmId,
                type: 'notification_email',
                status: 'sent', // Mark as sent
                metadata: {
                    subject: subject,
                    content_preview: emailContent.substring(0, 200) + '...',
                    full_content: emailContent,
                    attachment_count: attachments.length,
                    attachment_names: attachments.map(a => a.filename),
                    sent_to: toEmail
                }
            });

        if (logError) {
            console.error("DB Log Error:", logError);
            // Non-critical error
        }

        return { success: true, message: 'Benzer marka karşılaştırma raporlarınız firmaya iletilmiştir.' };

    } catch (error: any) {
        console.error("Mail Check Error:", error);
        return {
            success: false,
            message: `Sunucu hatası: ${error.message || 'Bilinmeyen hata'}`
        };
    }
}

export async function sendTestMailAction() {
    return sendEmail(
        "ozgur@upgunai.com",
        "Uygulama İçi Test Maili",
        "Bu mail uygulamadan başarıyla gönderildi."
    );
}
