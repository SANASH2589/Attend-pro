import { Request, Response } from 'express';
import { sendSMS } from '../services/sms/sms.service';
import { z } from 'zod';

const sendSchema = z.object({
  phone:  z.string().min(10).max(15),
  detail: z.string().min(1).max(500)
});

const testSchema = z.object({
  phone: z.string().min(10).max(15)
});

// POST /api/sms/send
export async function sendSmsController(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = sendSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors:  parsed.error.issues
    });
    return;
  }

  const result = await sendSMS(
    parsed.data.phone,
    parsed.data.detail
  );

  if (!result.success) {
    res.status(502).json({
      success: false,
      message: 'SMS delivery failed',
      error:   result.error
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: 'SMS sent successfully.'
  });
}

// POST /api/sms/test
export async function testSmsController(
  req: Request,
  res: Response
): Promise<void> {
  const parsed = testSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Valid phone number required'
    });
    return;
  }

  const result = await sendSMS(
    parsed.data.phone,
    'SMS integration is working successfully.'
  );

  res.status(result.success ? 200 : 502).json({
    success:          result.success,
    provider:         process.env.SMS_PROVIDER
                      || 'textplate',
    creditsRemaining: (result.raw as any)
                      ?.credits_remaining ?? 'N/A',
    response:         result.raw,
    error:            result.success
                      ? undefined : result.error
  });
}
