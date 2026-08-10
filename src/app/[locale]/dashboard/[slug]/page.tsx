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
import { CopyButton } from '@/components/shortener/copy-button';
import { DeleteLinkButton } from '@/components/shortener/delete-link-button';
import { LinkDetailStats } from '@/components/shortener/link-detail-stats';
import { SlugTypeBadge } from '@/components/shortener/slug-type-badge';
import { StatusBadge } from '@/components/shortener/status-badge';
import { ColorModeButton } from '@/components/ui/color-mode';
import { getLinkDetail } from '@/lib/shortener/get-link-detail';
import { getLinkStatus } from '@/lib/shortener/link-status';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/localization/navigation';

export default async function LinkDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
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
      <Flex
        as="header"
        justify="space-between"
        align="center"
        px={{ base: 4, md: 8 }}
        py="5"
      >
        <ChakraLink asChild fontFamily="mono" fontWeight="bold" fontSize="xl">
          <Link href="/">bref.</Link>
        </ChakraLink>
        <ColorModeButton />
      </Flex>

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
          <Link href="/dashboard">{'← tableau de bord'}</Link>
        </ChakraLink>

        <Stack
          gap="1"
          mb="8"
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
            créé le{' '}
            {new Date(link.createdAt).toLocaleDateString('fr-FR', {
              dateStyle: 'long',
            })}
          </Text>
        </Stack>

        <LinkDetailStats clicks={clicks} />
      </Container>
    </Flex>
  );
}
