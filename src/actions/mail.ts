'use server';

import { createClient } from '@/lib/supabase/server';

// Generic Email Sender Helper
export async function sendEmail(
    to: string,
    subject: string,
    text: string,
    attachments: any[] = [], // Allow generic attachments (path, cid, content)
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
    emailContent: string, // Treat this as HTML
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
        const attachments: any[] = attachmentData.map(item => ({
            filename: item.filename.endsWith('.pdf') ? item.filename : `${item.filename}.pdf`,
            content: Buffer.from(item.content, 'base64')
        }));

        // Add Signature Image (CID)
        const fs = require('fs');
        const path = require('path');
        const signaturePath = path.join(process.cwd(), 'public', 'images', 'mail-signature.png');

        if (fs.existsSync(signaturePath)) {
            // @ts-ignore
            attachments.push({
                filename: 'mail-signature.png',
                path: signaturePath, // Nodemailer supports path
                cid: 'signature' // CID for inline usage
            });
        }



        // 3. Send Email using Helper
        // Pass emailContent as HTML, and strip tags for plain text fallback
        const plainText = emailContent.replace(/<[^>]*>?/gm, '');

        // Replace the preview image URL with CID for the actual email
        const finalHtmlContent = emailContent.replace(
            /src="\/images\/mail-signature.png\?v=\d+"/g,
            'src="cid:signature"'
        );

        const result = await sendEmail(toEmail, subject, plainText, attachments, finalHtmlContent);

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
