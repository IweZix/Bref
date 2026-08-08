'use client';

import { Badge } from '@chakra-ui/react';
import type { LinkStatus } from '@/lib/shortener/link-status';

const STATUS_LABEL: Record<LinkStatus, string> = {
  active: 'actif',
  disabled: 'désactivé',
  expired: 'expiré',
};

const STATUS_COLOR_PALETTE: Record<LinkStatus, string> = {
  active: 'brand',
  disabled: 'gray',
  expired: 'red',
};

export function StatusBadge({ status }: { status: LinkStatus }) {
  if (status === 'active') return null; // "actif" is the unlabeled default state, per the mockup

  return (
    <Badge
      colorPalette={STATUS_COLOR_PALETTE[status]}
      variant="outline"
      borderRadius="full"
      fontFamily="mono"
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}
