import { ISmsProvider, SmsResponse } from './providers/ISmsProvider';
import { TextplateProvider } from './providers/textplate.provider';
import { SimulationProvider } from './providers/simulation.provider';

// ── Phone validation ──────────────────────────
function validatePhone(phone: string): {
  valid:      boolean;
  normalized: string;
  error?:     string;
} {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // E.164 with +91
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  // 10-digit Indian number
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return {
      valid:      true,
      normalized: `+91${cleaned}`
    };
  }

  // Other international E.164
  if (/^\+\d{8,15}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }

  return {
    valid:      false,
    normalized: cleaned,
    error:      `Invalid phone: "${phone}". ` +
                `Use 10-digit Indian number ` +
                `or E.164 format (+91XXXXXXXXXX).`
  };
}

// ── Provider factory ──────────────────────────
function createProvider(): ISmsProvider {
  const enabled  = process.env.SMS_ENABLED === 'true';
  const provider = (
    process.env.SMS_PROVIDER || 'textplate'
  ).toLowerCase();

  if (!enabled) {
    console.log('[SMS] Mode: Simulation');
    return new SimulationProvider();
  }

  switch (provider) {
    case 'textplate':
      console.log('[SMS] Provider: Textplate');
      return new TextplateProvider();
    // Future providers:
    // case 'msg91':    return new Msg91Provider();
    // case 'fast2sms': return new Fast2SmsProvider();
    default:
      console.warn(
        `[SMS] Unknown provider "${provider}" ` +
        `— falling back to simulation`
      );
      return new SimulationProvider();
  }
}

// Singleton — created once on server startup
const smsProvider: ISmsProvider = createProvider();

// ── Public API ────────────────────────────────

// Core send function
export async function sendSMS(
  phoneNumber: string,
  detail: string
): Promise<SmsResponse> {
  const check = validatePhone(phoneNumber);

  if (!check.valid) {
    console.error('[SMS] Invalid phone:', check.error);
    return { success: false, error: check.error };
  }

  console.log(
    '[SMS] Sending to:', check.normalized,
    '| Detail:', detail.substring(0, 60)
  );

  return smsProvider.sendSMS(check.normalized, detail);
}

// Attendance-specific wrapper
// Called when a student is marked absent
export async function sendAbsentSMS(
  parentPhone:  string,
  studentName:  string,
  sessionType:  string,
  sessionDate:  string,
  className:    string
): Promise<SmsResponse> {
  const detail =
    `${studentName} was marked ABSENT for ` +
    `${sessionType} session on ${sessionDate} ` +
    `at ${className}.`;

  return sendSMS(parentPhone, detail);
}
