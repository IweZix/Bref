import {
  Link as ChakraLink,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { resolveSlug } from '@/lib/shortener/resolve-slug';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default async function InterstitialPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; s?: string }>;
}) {
  const t = await getTranslations();
  const { slug, s } = await searchParams;
  if (!slug) notFound();

  const result = await resolveSlug(slug);
  if (result.status !== 'active') notFound();

  const destinationHost = new URL(result.link.targetUrl).hostname;
  // Carries the QR source marker through to the redirect route on the far
  // side of "Continuer" — otherwise a scanned link with an interstitial
  // would silently lose its source and get recorded as ordinary web traffic.
  const continueHref = `/api/r/${encodeURIComponent(slug)}?skip_interstitial=1${s ? `&s=${encodeURIComponent(s)}` : ''}`;
  const reportHref = `/report?slug=${encodeURIComponent(slug)}`;

  return (
    <Flex direction="column" minH="100vh" align="center" justify="center">
      <Container maxW="md">
        <Stack
          gap="4"
          p="6"
          borderWidth="1px"
          borderColor="app-border"
          borderRadius="lg"
          bg="app-bg"
        >
          <Heading fontFamily="mono" fontSize="lg">
            {t(tKeys.shortener.pages.interstitial.heading)}
          </Heading>
          <Text fontFamily="mono" color="fg.muted">
            {t(tKeys.shortener.pages.interstitial.body)}
          </Text>
          <Text fontFamily="mono" fontWeight="bold" truncate>
            {destinationHost}
          </Text>
          <ChakraLink
            asChild
            fontFamily="mono"
            fontWeight="bold"
            color="brand.fg"
          >
            <a href={continueHref}>
              {t(tKeys.shortener.pages.interstitial.continueButton)}
            </a>
          </ChakraLink>
          <ChakraLink asChild fontFamily="mono" fontSize="sm" color="fg.subtle">
            <Link href={reportHref}>
              {t(tKeys.shortener.pages.reportLinkAction)}
            </Link>
          </ChakraLink>
        </Stack>
      </Container>
    </Flex>
  );
}
