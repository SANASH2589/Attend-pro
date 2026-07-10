export interface SmsResponse {
  success:    boolean;
  messageId?: string;
  error?:     string;
  raw?:       unknown;
}

export interface ISmsProvider {
  sendSMS(
    phoneNumber: string,
    detail: string
  ): Promise<SmsResponse>;
}
