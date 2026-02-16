export interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
}

/**
 * Email Service
 * Supports multiple providers: SendGrid or SMTP
 */
class EmailService {
  private provider: string;
  private apiKey?: string;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'smtp';
    this.apiKey = process.env.EMAIL_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@ntsamaela.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Ntsamaela';
  }

  async sendEmail(to: string, subject: string, body: string, htmlBody?: string): Promise<EmailResponse> {
    try {
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendViaSendGrid(to, subject, body, htmlBody);
        case 'smtp':
        default:
          return await this.sendViaSMTP(to, subject, body, htmlBody);
      }
    } catch (error: any) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  private async sendViaSendGrid(to: string, subject: string, body: string, htmlBody?: string): Promise<EmailResponse> {
    if (!this.apiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.apiKey);

    const msg = {
      to,
      from: {
        email: this.fromEmail,
        name: this.fromName
      },
      subject,
      text: body,
      html: htmlBody || body.replace(/\n/g, '<br>')
    };

    try {
      await sgMail.send(msg);
      return {
        success: true,
        message: 'Email sent successfully via SendGrid'
      };
    } catch (error: any) {
      throw new Error(`SendGrid error: ${error.message}`);
    }
  }


  private async sendViaSMTP(to: string, subject: string, body: string, htmlBody?: string): Promise<EmailResponse> {
    // For development, just log the email
    if (process.env.NODE_ENV === 'development' || !process.env.SMTP_HOST) {
      console.log('📧 Email (SMTP - Development Mode):');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body: ${body}`);
      return {
        success: true,
        message: 'Email logged (development mode)'
      };
    }

    // Production SMTP implementation
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    try {
      const info = await transporter.sendMail({
        from: `${this.fromName} <${this.fromEmail}>`,
        to,
        subject,
        text: body,
        html: htmlBody || body.replace(/\n/g, '<br>')
      });

      return {
        success: true,
        message: 'Email sent successfully via SMTP',
        messageId: info.messageId
      };
    } catch (error: any) {
      throw new Error(`SMTP error: ${error.message}`);
    }
  }

  /**
   * Account Recovery Email - Only used when user loses their phone
   */
  async sendAccountRecoveryEmail(email: string, recoveryToken: string): Promise<EmailResponse> {
    const recoveryUrl = `${process.env.FRONTEND_URL || 'https://ntsamaelaweb-production.up.railway.app'}/account-recovery?token=${recoveryToken}`;
    const subject = 'Account Recovery - Ntsamaela';
    const body = `You requested to recover your Ntsamaela account. Click the following link to recover your account:\n\n${recoveryUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email and contact support immediately.`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Account Recovery Request</h2>
        <p>You requested to recover your Ntsamaela account. This is used when you lose access to your phone.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${recoveryUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Recover Account
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all;">${recoveryUrl}</p>
        <p><strong>This link will expire in 1 hour.</strong></p>
        <p style="color: #dc3545; margin-top: 20px;">If you didn't request account recovery, please ignore this email and contact support immediately.</p>
      </div>
    `;

    return await this.sendEmail(email, subject, body, htmlBody);
  }
}

export const emailService = new EmailService();

export const sendEmail = async (to: string, subject: string, body: string): Promise<EmailResponse> => {
  return await emailService.sendEmail(to, subject, body);
};

export const sendAccountRecoveryEmail = async (email: string, recoveryToken: string): Promise<EmailResponse> => {
  return await emailService.sendAccountRecoveryEmail(email, recoveryToken);
};
