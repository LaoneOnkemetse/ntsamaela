export interface SmsResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const sendSms = async (_to: string, _message: string): Promise<SmsResponse> => {
  // TODO: Implement actual SMS sending logic
  return { success: true };
};

export const sendVerificationCode = async (_phone: string, _code: string): Promise<SmsResponse> => {
  // TODO: Implement verification SMS logic
  return { success: true };
};
