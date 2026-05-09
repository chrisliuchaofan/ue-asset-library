export function getOtpSendErrorResponse(error: unknown) {
  const authError = error as { code?: unknown; message?: unknown; status?: unknown };
  const code = typeof authError.code === 'string' ? authError.code : '';
  const message = typeof authError.message === 'string' ? authError.message : '';
  const status = typeof authError.status === 'number' ? authError.status : undefined;
  const lowerMessage = message.toLowerCase();

  if (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    lowerMessage.includes('email rate limit')
  ) {
    return {
      status: 429,
      message: '验证码邮件发送过于频繁，请稍后再试；如果多人同时注册，请联系管理员配置企业邮箱发信服务',
    };
  }

  return {
    status: 500,
    message: '验证码发送失败，请稍后重试',
  };
}
