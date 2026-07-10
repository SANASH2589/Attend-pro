import axios, { AxiosError } from 'axios';
import { ISmsProvider, SmsResponse } from './ISmsProvider';

export class TextplateProvider implements ISmsProvider {
  private readonly apiKey:     string;
  private readonly baseUrl:    string;
  private readonly templateId: string;

  constructor() {
    const apiKey     = process.env.TEXTPLATE_API_KEY;
    const baseUrl    = process.env.TEXTPLATE_BASE_URL;
    const templateId = process.env.TEXTPLATE_TEMPLATE_ID;

    if (!apiKey || !baseUrl || !templateId) {
      throw new Error(
        '[SMS] Textplate config missing. Check ' +
        'TEXTPLATE_API_KEY, TEXTPLATE_BASE_URL, ' +
        'TEXTPLATE_TEMPLATE_ID in .env'
      );
    }

    this.apiKey     = apiKey;
    this.baseUrl    = baseUrl;
    this.templateId = templateId;

    console.log(
      '[SMS] Textplate key prefix:',
      this.apiKey.substring(0, 8)
    );
    console.log(
      '[SMS] Template ID prefix:',
      this.templateId.substring(0, 8)
    );
  }

  async sendSMS(
    phoneNumber: string,
    detail: string
  ): Promise<SmsResponse> {
    try {
      // Use URLSearchParams — matches exactly 
      // what Textplate dashboard sends
      const params = new URLSearchParams();
      params.append('mobileNumber',      phoneNumber);
      params.append('templateId',        this.templateId);
      params.append('detailValue',       detail);

      console.log('[SMS] Sending to Textplate:', {
        mobileNumber: phoneNumber,
        templateId:   this.templateId.substring(0, 8) + '...',
        detailValue:  detail.substring(0, 50)
      });

      const response = await axios.post(
        this.baseUrl,
        params,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      console.log(
        '[SMS] Textplate response:',
        response.status,
        response.data
      );

      return {
        success:   true,
        messageId: response.data?.message_id
                   || response.data?.id
                   || String(Date.now()),
        raw:       response.data
      };

    } catch (error) {
      const err = error as AxiosError;
      console.error(
        '[SMS] Textplate error:',
        err.response?.status ?? 'no-response',
        err.response?.data   ?? err.message
      );
      return {
        success: false,
        error:   err.response?.data
                   ? JSON.stringify(err.response.data)
                   : err.message,
        raw:     err.response?.data
      };
    }
  }
}

