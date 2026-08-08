export type DeviceType = 'mobile' | 'desktop' | 'tablet';

export function detectDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return 'desktop';
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet(?!.*mobile)|playbook|silk/.test(ua)) return 'tablet';
  if (
    /mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/.test(ua)
  )
    return 'mobile';
  return 'desktop';
}
