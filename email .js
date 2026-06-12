// config/email.js — Nodemailer Email Setup
const nodemailer = require('nodemailer');

// Create transporter (Gmail)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000, // 10 seconds max to connect
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// ── Send Enquiry Email to Client ──
const sendEnquiryEmail = async (enquiry) => {
  const mailOptions = {
    from: `"IMAKSA Website" <${process.env.EMAIL_USER}>`,
    to: process.env.CLIENT_EMAIL,
    subject: `🏡 New Property Enquiry from ${enquiry.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAFAF8;border:1px solid #DDD3C0;">
        
        <!-- HEADER -->
        <div style="background:#0D4F4A;padding:28px 32px;">
          <h1 style="color:#F5EFE4;font-size:22px;margin:0;letter-spacing:3px;">IMAKSA</h1>
          <p style="color:rgba(245,239,228,.6);font-size:12px;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">New Website Enquiry</p>
        </div>

        <!-- BODY -->
        <div style="padding:32px;">
          <h2 style="color:#0D4F4A;font-size:20px;margin:0 0 24px;">You have a new enquiry!</h2>
          
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;width:35%;">Full Name</td>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:14px;color:#0A0A0A;font-weight:600;">${enquiry.name}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;">Email</td>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:14px;color:#0A0A0A;"><a href="mailto:${enquiry.email}" style="color:#0D4F4A;">${enquiry.email}</a></td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;">Phone</td>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:14px;color:#0A0A0A;"><a href="tel:${enquiry.phone}" style="color:#0D4F4A;">${enquiry.phone}</a></td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;">Interest</td>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:14px;color:#0A0A0A;">${enquiry.interest || '—'}</td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;">Budget</td>
              <td style="padding:12px 0;border-bottom:1px solid #DDD3C0;font-size:14px;color:#0A0A0A;">${enquiry.budget || '—'}</td>
            </tr>
          </table>

          <!-- MESSAGE -->
          <div style="margin-top:24px;">
            <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;margin-bottom:10px;">Message</p>
            <div style="background:#F5EFE4;border-left:3px solid #0D4F4A;padding:16px;font-size:14px;color:#0A0A0A;line-height:1.7;">
              ${enquiry.message || 'No message provided'}
            </div>
          </div>

          <!-- CTA BUTTONS -->
          <div style="margin-top:28px;display:flex;gap:12px;">
            <a href="mailto:${enquiry.email}?subject=Re: Your Property Enquiry - IMAKSA" 
               style="display:inline-block;background:#0D4F4A;color:#F5EFE4;padding:12px 24px;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:600;">
              ✉️ Reply by Email
            </a>
            <a href="https://wa.me/${enquiry.phone?.replace(/\D/g, '')}?text=Hi ${enquiry.name}, thank you for your enquiry about IMAKSA Properties."
               style="display:inline-block;background:#25D366;color:#fff;padding:12px 24px;font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;font-weight:600;">
              💬 WhatsApp
            </a>
          </div>
        </div>

        <!-- FOOTER -->
        <div style="background:#EDE5D8;padding:20px 32px;text-align:center;">
          <p style="font-size:11px;color:#888;margin:0;">This email was sent automatically by your IMAKSA website</p>
          <p style="font-size:11px;color:#888;margin:4px 0 0;">© 2025 IMAKSA Properties LLC. RERA Licensed.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ── Send Confirmation to Client/Lead ──
const sendConfirmationEmail = async (enquiry) => {
  const mailOptions = {
    from: `"IMAKSA Properties" <${process.env.EMAIL_USER}>`,
    to: enquiry.email,
    subject: `Thank you for your enquiry — IMAKSA Properties`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAFAF8;border:1px solid #DDD3C0;">
        <div style="background:#0D4F4A;padding:28px 32px;">
          <h1 style="color:#F5EFE4;font-size:22px;margin:0;letter-spacing:3px;">IMAKSA</h1>
          <p style="color:rgba(245,239,228,.6);font-size:12px;margin:4px 0 0;">Luxury Real Estate Dubai</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#0D4F4A;font-size:20px;margin:0 0 16px;">Thank you, ${enquiry.name}!</h2>
          <p style="font-size:14px;color:#4A4A4A;line-height:1.8;margin-bottom:20px;">
            We've received your enquiry and one of our property consultants will contact you within <strong>24 hours</strong>.
          </p>
          <div style="background:#F5EFE4;border:1px solid #DDD3C0;padding:20px;margin-bottom:24px;">
            <p style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#888;margin:0 0 8px;">Your Enquiry Summary</p>
            <p style="font-size:14px;color:#0A0A0A;margin:4px 0;"><strong>Property Interest:</strong> ${enquiry.interest || '—'}</p>
            <p style="font-size:14px;color:#0A0A0A;margin:4px 0;"><strong>Budget Range:</strong> ${enquiry.budget || '—'}</p>
          </div>
          <p style="font-size:13px;color:#4A4A4A;line-height:1.8;">
            In the meantime, browse our latest listings at <a href="${process.env.FRONTEND_URL}/properties.html" style="color:#0D4F4A;">imaksa.ae/properties</a>
          </p>
          <div style="margin-top:24px;padding-top:20px;border-top:1px solid #DDD3C0;">
            <p style="font-size:12px;color:#888;margin:0;">📞 +971 4 XXX XXXX &nbsp;|&nbsp; ✉️ info@imaksa.ae</p>
            <p style="font-size:12px;color:#888;margin:4px 0 0;">📍 Business Bay, Dubai, UAE &nbsp;|&nbsp; Mon–Sat: 9am–7pm</p>
          </div>
        </div>
        <div style="background:#EDE5D8;padding:16px 32px;text-align:center;">
          <p style="font-size:11px;color:#888;margin:0;">© 2025 IMAKSA Properties LLC. RERA Licensed.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// ── Verify connection ──
const verifyEmail = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email server ready');
  } catch (err) {
    console.log('⚠️  Email not configured:', err.message);
  }
};

module.exports = { sendEnquiryEmail, sendConfirmationEmail, verifyEmail };
