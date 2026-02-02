
const nodemailer = require('nodemailer');

async function valdateSMTP() {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
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
