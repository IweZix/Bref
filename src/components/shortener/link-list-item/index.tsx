'use client';

import {
  Box,
  Link as ChakraLink,
  Flex,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CopyButton } from '@/components/shortener/copy-button';
import { SlugTypeBadge } from '@/components/shortener/slug-type-badge';
import { StatusBadge } from '@/components/shortener/status-badge';
import type { DashboardLink } from '@/lib/shortener/get-dashboard-links';
import { getLinkStatus } from '@/lib/shortener/link-status';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export function LinkListItem({ link }: { link: DashboardLink }) {
  const t = useTranslations();
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  const shortUrl = origin
    ? `${origin.replace(/^https?:\/\//, '')}/${link.slug}`
    : `/${link.slug}`;
  const fullShortUrl = origin ? `${origin}/${link.slug}` : `/${link.slug}`;
  const status = getLinkStatus(link);

  return (
    <Flex
      justify="space-between"
      align="center"
      gap="4"
      p="4"
      borderWidth="1px"
      borderColor="app-border"
      borderRadius="lg"
      bg="app-bg"
    >
      <Stack gap="1" minW="0" flex="1">
        {link.title && (
          <Text fontFamily="mono" fontSize="sm" color="fg.muted" truncate>
            {link.title}
          </Text>
        )}
        <HStack gap="2">
          <ChakraLink
            asChild
            fontFamily="mono"
            fontWeight="bold"
            _hover={{ color: 'brand.fg' }}
          >
            <Link href={`/dashboard/${link.slug}`}>{shortUrl}</Link>
          </ChakraLink>
          <StatusBadge status={status} />
          <SlugTypeBadge isCustomSlug={link.isCustomSlug} />
        </HStack>
        <Text fontFamily="mono" fontSize="sm" color="fg.subtle" truncate>
          {link.targetUrl}
        </Text>
      </Stack>

      <Box textAlign="right" flexShrink={0}>
        <Text fontFamily="mono" fontWeight="bold" fontSize="xl">
          {link.clicksLast7Days}
        </Text>
        <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
          {t(tKeys.shortener.linkListItem.clicksPerWeek)}
        </Text>
        {link.previewsLast7Days > 0 && (
          <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
            {t(tKeys.shortener.linkListItem.previewsCount, {
              count: link.previewsLast7Days,
            })}
          </Text>
        )}
      </Box>

      <CopyButton value={fullShortUrl} size="sm" flexShrink={0} />
    </Flex>
  );
}
