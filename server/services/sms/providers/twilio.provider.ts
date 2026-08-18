import twilio from 'twilio';
import { ISmsProvider, SmsResponse } from './ISmsProvider';

export class TwilioProvider implements ISmsProvider {

  private readonly client: ReturnType<typeof twilio>;
  private readonly fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error(
        '[SMS] Twilio config missing. Check ' +
        'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, ' +
        'TWILIO_PHONE_NUMBER in .env'
      );
    }

    this.client     = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;

    console.log(
      '[SMS] Twilio initialized. From:',
      this.fromNumber
    );
  }

  async sendSMS(
    phoneNumber: string,
    message: string
  ): Promise<SmsResponse> {
    try {
      console.log('[SMS] Sending via Twilio to:', phoneNumber);

      const msg = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to:   phoneNumber
      });

      console.log(
        '[SMS] Twilio success. SID:', msg.sid,
        'Status:', msg.status
      );

      return {
        success:   true,
        messageId: msg.sid,
        raw:       {
          sid:    msg.sid,
          status: msg.status,
          to:     msg.to,
          from:   msg.from
        }
      };

    } catch (error: any) {
      // Log without exposing auth token
      console.error(
        '[SMS] Twilio error:',
        error.code,
        error.message
      );

      // Twilio-specific error codes
      let userMessage = error.message;
      if (error.code === 21608) {
        userMessage =
          'Phone number not verified. ' +
          'Add it to Twilio Verified Caller IDs.';
      } else if (error.code === 21211) {
        userMessage = 'Invalid phone number format.';
      } else if (error.code === 20003) {
        userMessage =
          'Twilio auth failed. Check credentials.';
      }

      return {
        success: false,
        error:   userMessage,
        raw:     {
          code:    error.code,
          message: error.message,
          status:  error.status
        }
      };
    }
  }
}
