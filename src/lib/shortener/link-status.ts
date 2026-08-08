export type LinkStatus = 'active' | 'disabled' | 'expired';

export function getLinkStatus(link: {
  isActive: boolean;
  expiresAt: string | null;
}): LinkStatus {
  if (link.expiresAt && new Date(link.expiresAt) <= new Date())
    return 'expired';
  if (!link.isActive) return 'disabled';
  return 'active';
}
