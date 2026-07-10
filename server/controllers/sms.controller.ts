import { Request, Response } from 'express';
import { sendSMS } from '../services/sms/sms.service';
import { z } from 'zod';

const sendSchema = z.object({
  phone:   z.string().min(10).max(15),
  message: z.string().min(1).max(500)
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
    parsed.data.message
  );

  res.status(result.success ? 200 : 502).json(
    result.success
      ? { success: true,
          message: 'SMS sent successfully.' }
      : { success: false,
          message: 'SMS delivery failed',
          error:   result.error }
  );
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
    'Attend-Pro: SMS integration is working successfully.'
  );

  res.status(result.success ? 200 : 502).json({
    success:  result.success,
    provider: 'twilio',
    response: result.raw,
    error:    result.success ? undefined : result.error
  });
}
