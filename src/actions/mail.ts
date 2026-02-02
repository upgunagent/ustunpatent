'use server';

import { createClient } from '@/lib/supabase/server';

export async function sendTrademarkNotification(
    firmId: string,
    emailContent: string,
    subject: string,
    attachmentData: { filename: string, content: string }[]
) {
    try {
        // Dynamic import to avoid bundling issues
        const nodemailer = require('nodemailer');

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

        // 2. Configure Transporter
        const transporter = nodemailer.createTransport({
            host: "smtp-mail.outlook.com",
            port: 587,
            secure: false, // STARTTLS
            auth: {
                user: "web@ustunpatent.com",
                pass: "Ustunveb!2026",
            },
            tls: {
                ciphers: 'SSLv3'
            }
        });

        // 3. Process Attachments
        const attachments = attachmentData.map(item => ({
            filename: item.filename.endsWith('.pdf') ? item.filename : `${item.filename}.pdf`,
            content: Buffer.from(item.content, 'base64')
        }));

        // 4. Send Email
        console.log(`Sending email to ${toEmail} with ${attachments.length} attachments...`);
        await transporter.sendMail({
            from: '"Üstün Patent" <web@ustunpatent.com>',
            to: toEmail,
            subject: subject,
            text: emailContent,
            attachments: attachments
        });

        // 5. Log to Database
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
        console.error("Mail Send Error Full:", error);
        return {
            success: false,
            message: `Sunucu hatası: ${error.message || 'Bilinmeyen hata'}`
        };
    }
}

export async function sendTestMailAction() {
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
            host: "smtp-mail.outlook.com",
            port: 587,
            secure: false,
            auth: {
                user: "web@ustunpatent.com",
                pass: "Ustunveb!2026",
            },
            tls: { ciphers: 'SSLv3' }
        });

        await transporter.sendMail({
            from: '"Test" <web@ustunpatent.com>',
            to: "ozgur@upgunai.com",
            subject: "Uygulama İçi Test Maili",
            text: "Bu mail uygulamadan başarıyla gönderildi."
        });
        return { success: true, message: 'Test maili gönderildi.' };
    } catch (error: any) {
        console.error("Test Mail Error:", error);
        return { success: false, message: error.message };
    }
}
