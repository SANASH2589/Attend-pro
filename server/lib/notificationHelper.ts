import { supabaseAdmin } from './supabase';

interface CreateNotificationParams {
  userId:  string;
  title:   string;
  message: string;
  type:    'sms_sent' | 'sms_failed' | 
           'session_locked' | 'info';
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: params.userId,
        title:   params.title,
        message: params.message,
        type:    params.type,
        read:    false,
      });
  } catch (err: any) {
    // Never throw — notifications are 
    // non-critical, never block main flow
    console.error(
      '[Notifications] Create error:', 
      err.message
    );
  }
}
