export interface SmsResponse {
  success: boolean;
  message?: string;
  error?: string;
  messageId?: string;
}

/**
 * SMS Service
 * Supports multiple providers: Twilio, Africa's Talking, or mock for development
 */
class SmsService {
  private provider: string;
  private apiKey?: string;
  private apiSecret?: string;
  private fromNumber?: string;
  private username?: string; // For Africa's Talking

  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'mock';
    this.apiKey = process.env.SMS_API_KEY;
    this.apiSecret = process.env.SMS_API_SECRET;
    this.fromNumber = process.env.SMS_FROM_NUMBER;
    this.username = process.env.SMS_USERNAME; // For Africa's Talking
  }

  async sendSms(to: string, message: string): Promise<SmsResponse> {
    try {
      switch (this.provider.toLowerCase()) {
        case 'twilio':
          return await this.sendViaTwilio(to, message);
        case 'africas_talking':
        case 'africastalking':
          return await this.sendViaAfricasTalking(to, message);
        case 'mock':
        default:
          return await this.sendViaMock(to, message);
      }
    } catch (error: any) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
      };
    }
  }

  private async sendViaTwilio(to: string, message: string): Promise<SmsResponse> {
    if (!this.apiKey || !this.apiSecret) {
      throw new Error('Twilio credentials not configured');
    }

    const twilio = require('twilio');
    const client = twilio(this.apiKey, this.apiSecret);

    try {
      const result = await client.messages.create({
        body: message,
        from: this.fromNumber,
        to
      });

      return {
        success: true,
        message: 'SMS sent successfully via Twilio',
        messageId: result.sid
      };
    } catch (error: any) {
      throw new Error(`Twilio error: ${error.message}`);
    }
  }


  private async sendViaAfricasTalking(to: string, message: string): Promise<SmsResponse> {
    // Africa's Talking - Best for African markets including Botswana
    if (!this.username || !this.apiKey) {
      throw new Error('Africa\'s Talking credentials not configured (SMS_USERNAME and SMS_API_KEY required)');
    }

    try {
      const AfricasTalking = require('africastalking');
      const africastalking = AfricasTalking({
        username: this.username,
        apiKey: this.apiKey
      });

      const sms = africastalking.SMS;
      // In sandbox mode, don't use 'from' field - Africa's Talking will use default sender
      // For production, you can use a registered shortcode or alphanumeric sender ID
      const options: any = {
        to: [to],
        message: message
      };
      
      // Only add 'from' if provided and not in sandbox (sandbox doesn't allow custom sender IDs)
      if (this.fromNumber && this.username !== 'sandbox') {
        options.from = this.fromNumber;
      }

      const result = await sms.send(options);
      
      return {
        success: true,
        message: 'SMS sent successfully via Africa\'s Talking',
        messageId: result.SMSMessageData?.Recipients?.[0]?.messageId || 'unknown'
      };
    } catch (error: any) {
      throw new Error(`Africa's Talking error: ${error.message}`);
    }
  }

  private async sendViaMock(to: string, message: string): Promise<SmsResponse> {
    // For development, just log the SMS
    console.log('📱 SMS (Mock - Development Mode):');
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    return {
      success: true,
      message: 'SMS logged (development mode)'
    };
  }

  async sendVerificationCode(phone: string, code: string): Promise<SmsResponse> {
    const message = `Your Ntsamaela verification code is: ${code}. This code will expire in 10 minutes.`;
    return await this.sendSms(phone, message);
  }

  async sendDeliveryPin(phone: string, pin: string, packageId: string): Promise<SmsResponse> {
    const message = `Your Ntsamaela delivery confirmation PIN is: ${pin}. Please provide this PIN to the driver to confirm delivery. Package ID: ${packageId.substring(0, 8)}...`;
    return await this.sendSms(phone, message);
  }

  async sendOtp(phone: string, code: string, purpose: 'registration' | 'login' | 'password_reset' = 'registration'): Promise<SmsResponse> {
    let message = '';
    switch (purpose) {
      case 'registration':
        message = `Your Ntsamaela registration code is: ${code}. This code will expire in 10 minutes.`;
        break;
      case 'login':
        message = `Your Ntsamaela login code is: ${code}. This code will expire in 10 minutes.`;
        break;
      case 'password_reset':
        message = `Your Ntsamaela password reset code is: ${code}. This code will expire in 10 minutes.`;
        break;
      default:
        message = `Your Ntsamaela verification code is: ${code}. This code will expire in 10 minutes.`;
    }
    return await this.sendSms(phone, message);
  }
}

export const smsService = new SmsService();

export const sendSms = async (to: string, message: string): Promise<SmsResponse> => {
  return await smsService.sendSms(to, message);
};

export const sendVerificationCode = async (phone: string, code: string): Promise<SmsResponse> => {
  return await smsService.sendVerificationCode(phone, code);
};

export const sendDeliveryPin = async (phone: string, pin: string, packageId: string): Promise<SmsResponse> => {
  return await smsService.sendDeliveryPin(phone, pin, packageId);
};

export const sendOtp = async (phone: string, code: string, purpose?: 'registration' | 'login' | 'password_reset'): Promise<SmsResponse> => {
  return await smsService.sendOtp(phone, code, purpose);
};
