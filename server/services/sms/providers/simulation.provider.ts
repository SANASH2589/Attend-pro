import { ISmsProvider, SmsResponse } from './ISmsProvider';

export class SimulationProvider implements ISmsProvider {
  async sendSMS(
    phoneNumber: string,
    detail: string
  ): Promise<SmsResponse> {

    await new Promise(r => setTimeout(r, 150));

    console.log('[SMS Simulation]', {
      to:     phoneNumber,
      detail: detail,
      note:   'SMS_ENABLED=false — not sent'
    });

    return {
      success:   true,
      messageId: `sim_${Date.now()}`,
      raw:       { simulated: true }
    };
  }
}
