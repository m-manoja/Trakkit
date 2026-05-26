import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';

// Ensure environment variables are loaded in this module
dotenv.config();

let transporter: any = null;

function getTransporter() {
  if (!transporter) {
    const host = process.env.EMAIL_HOST;
    const port = Number(process.env.EMAIL_PORT) || 587;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    console.log(`[EmailService] Initializing transporter: host=${host}, port=${port}, user=${user}`);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: false, // true for port 465, false for 587 (STARTTLS)
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

function baseTemplate(headerTitle: string, headerSub: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#A83B5E 0%,#c0527a 100%);padding:28px 32px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.5px;">Trakkit</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.82);font-size:13px;">${headerSub}</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
      </table>
      <p style="margin:20px 0 0;color:#bbbbbb;font-size:11px;">© ${new Date().getFullYear()} Trakkit. All rights reserved.</p>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const fromAddress = process.env.EMAIL_FROM || `Trakkit <${process.env.EMAIL_USER}>`;
  const body = `
    <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px;font-weight:700;">Reset your password</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
      We received a request to reset the password for your Trakkit backup login. Click the button below to choose a new password.
    </p>
    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#A83B5E,#c0527a);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Reset Password</a>
    <p style="margin:24px 0 0;color:#aaa;font-size:12px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>`;

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: 'Reset your Trakkit password',
    text: `Reset your Trakkit password\n\nClick here: ${resetUrl}\n\nThis link expires in 1 hour.\n\n— Trakkit`,
    html: baseTemplate('Reset Password', 'Password reset request', body),
  });
}

export async function sendEmailVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  const fromAddress = process.env.EMAIL_FROM || `Trakkit <${process.env.EMAIL_USER}>`;
  const body = `
    <h2 style="margin:0 0 12px;color:#1a1a1a;font-size:20px;font-weight:700;">Verify your email</h2>
    <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
      Thanks for joining Trakkit! Please verify your email address by clicking the button below.
    </p>
    <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#A83B5E,#c0527a);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:700;">Verify Email</a>
    <p style="margin:24px 0 0;color:#aaa;font-size:12px;">This link expires in 24 hours. If you didn't create a Trakkit account, you can safely ignore this email.</p>`;

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: 'Verify your Trakkit email',
    text: `Verify your Trakkit email\n\nClick here: ${verifyUrl}\n\nThis link expires in 24 hours.\n\n— Trakkit`,
    html: baseTemplate('Verify Email', 'Email verification', body),
  });
}

/**
 * Sends an HTML email notification for a reminder.
 */
export async function sendEmailNotification(
  to: string,
  title: string,
  body: string
): Promise<void> {
  const fromAddress = process.env.EMAIL_FROM || `Trakkit <${process.env.EMAIL_USER}>`;
  const mailTransporter = getTransporter();

  await mailTransporter.sendMail({
    from: fromAddress,
    to,
    subject: `🔔 ${title}`,
    text: `${title}\n\n${body}\n\n— Trakkit`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${title}</title>
        </head>
        <body style="margin:0; padding:0; background-color:#f4f4f5; font-family: 'Helvetica Neue', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding: 40px 0;">
            <tr>
              <td align="center">
                <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  
                  <!-- Header bar -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #A83B5E 0%, #c0527a 100%); padding: 28px 32px; text-align: center;">
                      <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:0.5px;">🔔 Trakkit</h1>
                      <p style="margin:6px 0 0; color:rgba(255,255,255,0.82); font-size:13px;">You have a reminder</p>
                    </td>
                  </tr>
                  
                  <!-- Body -->
                  <tr>
                    <td style="padding: 32px;">
                      <h2 style="margin: 0 0 12px; color:#1a1a1a; font-size:20px; font-weight:700; line-height:1.3;">
                        ${title}
                      </h2>
                      <p style="margin: 0 0 28px; color:#555555; font-size:15px; line-height:1.6;">
                        ${body}
                      </p>
                      
                      <!-- Divider -->
                      <hr style="border:none; border-top:1px solid #f0f0f0; margin: 0 0 24px;" />
                      
                      <!-- Footer note -->
                      <p style="margin:0; color:#aaaaaa; font-size:12px; text-align:center;">
                        This reminder was sent by <strong style="color:#A83B5E;">Trakkit</strong>. 
                        You can manage your notification preferences in the app settings.
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
                <!-- Bottom caption -->
                <p style="margin:20px 0 0; color:#bbbbbb; font-size:11px;">
                  © ${new Date().getFullYear()} Trakkit. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
}
