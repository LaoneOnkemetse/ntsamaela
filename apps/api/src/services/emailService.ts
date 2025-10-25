export interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const sendEmail = async (_to: string, _subject: string, _body: string): Promise<EmailResponse> => {
  // TODO: Implement actual email sending logic
  return { success: true };
};

export const sendVerificationEmail = async (_email: string, _code: string): Promise<EmailResponse> => {
  // TODO: Implement verification email logic
  return { success: true };
};

export const sendPasswordResetEmail = async (_email: string, _resetToken: string): Promise<EmailResponse> => {
  // TODO: Implement password reset email logic
  return { success: true };
};
