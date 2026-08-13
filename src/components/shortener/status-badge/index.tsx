'use client';

import { Badge } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import type { LinkStatus } from '@/lib/shortener/link-status';
import { tKeys } from '@/localization/tKeys';

type Translator = ReturnType<typeof useTranslations>;

function getStatusLabels(t: Translator): Record<LinkStatus, string> {
  return {
    active: t(tKeys.shortener.statusBadge.active),
    disabled: t(tKeys.shortener.statusBadge.disabled),
    expired: t(tKeys.shortener.statusBadge.expired),
  };
}

const STATUS_COLOR_PALETTE: Record<LinkStatus, string> = {
  active: 'brand',
  disabled: 'gray',
  expired: 'red',
};

export function StatusBadge({ status }: { status: LinkStatus }) {
  const t = useTranslations();
  if (status === 'active') return null; // "actif" is the unlabeled default state, per the mockup

  const statusLabel = getStatusLabels(t);

  return (
    <Badge
      colorPalette={STATUS_COLOR_PALETTE[status]}
      variant="outline"
      borderRadius="full"
      fontFamily="mono"
    >
      {statusLabel[status]}
    </Badge>
  );
}
