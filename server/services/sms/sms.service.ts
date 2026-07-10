import { ISmsProvider, SmsResponse } from './providers/ISmsProvider';
import { TwilioProvider } from './providers/twilio.provider';
import { SimulationProvider } from './providers/simulation.provider';

// Phone number validation
function validatePhone(phone: string): {
  valid:      boolean;
  normalized: string;
  error?:     string;
} {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Already E.164
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  // 10-digit Indian number
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      valid:      true,
      normalized: `+91${cleaned}`
    };
  }

  return {
    valid:      false,
    normalized: cleaned,
    error:
      `Invalid phone number: "${phone}". ` +
      `Use 10-digit Indian number or ` +
      `E.164 format (+91XXXXXXXXXX).`
  };
}

// Provider factory
function createProvider(): ISmsProvider {
  const enabled = process.env.SMS_ENABLED === 'true';

  if (!enabled) {
    console.log('[SMS] Mode: Simulation');
    return new SimulationProvider();
  }

  console.log('[SMS] Mode: Live — Provider: Twilio');
  return new TwilioProvider();
}

// Singleton
const smsProvider: ISmsProvider = createProvider();

// Core send function
export async function sendSMS(
  phoneNumber: string,
  message: string
): Promise<SmsResponse> {
  const check = validatePhone(phoneNumber);

  if (!check.valid) {
    console.error('[SMS] Validation failed:', check.error);
    return { success: false, error: check.error };
  }

  console.log('[SMS] Sending to:', check.normalized);

  return smsProvider.sendSMS(check.normalized, message);
}

// Attendance-specific message builder
export async function sendAbsentSMS(
  parentPhone:  string,
  studentName:  string,
  sessionType:  string,
  sessionDate:  string,
  className:    string
): Promise<SmsResponse> {
  const message =
    `Attend-Pro Alert: Your ward ${studentName} ` +
    `was marked ABSENT for the ${sessionType} ` +
    `session on ${sessionDate} at ${className}. ` +
    `For queries contact the college.`;

  return sendSMS(parentPhone, message);
}
