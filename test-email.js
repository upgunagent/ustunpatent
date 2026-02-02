
const nodemailer = require('nodemailer');

async function valdateSMTP() {
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

    try {
        console.log("Verifying SMTP connection...");
        await transporter.verify();
        console.log("SMTP Connection Successful!");

        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: '"Test" <web@ustunpatent.com>',
            to: "ozgur@upgunai.com", // Send to user himself
            subject: "SMTP Test Mail",
            text: "This is a test email to verify credentials."
        });
        console.log("Message sent: %s", info.messageId);
    } catch (error) {
        console.error("SMTP Error:", error);
    }
}

valdateSMTP();
