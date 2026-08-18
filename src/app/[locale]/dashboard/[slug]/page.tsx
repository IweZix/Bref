import {
  Link as ChakraLink,
  Container,
  Flex,
  HStack,
  Stack,
  Text,
} from '@chakra-ui/react';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/core/site-header';
import { CopyButton } from '@/components/shortener/copy-button';
import { DeleteLinkButton } from '@/components/shortener/delete-link-button';
import { LinkDetailStats } from '@/components/shortener/link-detail-stats';
import { LinkQrCode } from '@/components/shortener/link-qr-code';
import { SlugTypeBadge } from '@/components/shortener/slug-type-badge';
import { StatusBadge } from '@/components/shortener/status-badge';
import { getLinkDetail } from '@/lib/shortener/get-link-detail';
import { getLinkStatus } from '@/lib/shortener/link-status';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default async function LinkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslations();
  const format = await getFormatter();
  const { slug } = await params;
  const supabase = await createClient();
  const result = await getLinkDetail(supabase, slug);

  if (!result) notFound();

  const { link, clicks } = result;
  const status = getLinkStatus(link);
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  const protocol = host?.startsWith('localhost') ? 'http' : 'https';
  const shortUrl = host
    ? `${protocol}://${host}/${link.slug}`
    : `/${link.slug}`;

  return (
    <Flex direction="column" minH="100vh">
      <SiteHeader />

      <Container flex="1" maxW="3xl" pb="12">
        <ChakraLink
          asChild
          fontFamily="mono"
          fontSize="sm"
          color="fg.muted"
          _hover={{ color: 'brand.fg' }}
          mb="4"
          display="inline-block"
        >
          <Link href="/dashboard">
            {t(tKeys.shortener.pages.linkDetail.backToDashboard)}
          </Link>
        </ChakraLink>

        <Flex gap="4" wrap="wrap" align="flex-start" mb="8">
          <Stack
            gap="1"
            flex="1"
            minW="0"
            p="5"
            borderWidth="1px"
            borderColor="app-border"
            borderRadius="lg"
            bg="app-bg"
          >
            {link.title && (
              <Text fontFamily="mono" fontSize="sm" color="fg.muted">
                {link.title}
              </Text>
            )}
            <HStack gap="3" wrap="wrap">
              <Text fontFamily="mono" fontWeight="bold" fontSize="lg">
                /{link.slug}
              </Text>
              <StatusBadge status={status} />
              <SlugTypeBadge isCustomSlug={link.isCustomSlug} />
              <CopyButton value={shortUrl} size="xs" />
              <DeleteLinkButton
                linkId={link.id}
                isCustomSlug={link.isCustomSlug}
              />
            </HStack>
            <Text fontFamily="mono" fontSize="sm" color="fg.subtle" truncate>
              {link.targetUrl}
            </Text>
            <Text fontFamily="mono" fontSize="xs" color="fg.subtle">
              {t(tKeys.shortener.pages.linkDetail.createdOn, {
                date: format.dateTime(new Date(link.createdAt), {
                  dateStyle: 'long',
                }),
              })}
            </Text>
          </Stack>

          {status === 'active' ? (
            <LinkQrCode slug={link.slug} shortUrl={shortUrl} />
          ) : (
            <Text fontFamily="mono" fontSize="sm" color="fg.muted" maxW="xs">
              {t(tKeys.shortener.pages.linkDetail.noQrCode, {
                status: t(
                  tKeys.shortener.statusBadge[
                    status === 'disabled' ? 'disabled' : 'expired'
                  ],
                ),
              })}
            </Text>
          )}
        </Flex>

        <LinkDetailStats clicks={clicks} />
      </Container>
    </Flex>
  );
}
