import { Container, Flex, Heading, HStack } from '@chakra-ui/react';
import { getTranslations } from 'next-intl/server';
import { SiteHeader } from '@/components/core/site-header';
import { BrowserWarningBanner } from '@/components/shortener/browser-warning-banner';
import { ExportLinksButton } from '@/components/shortener/export-links-button';
import { LinkList } from '@/components/shortener/link-list';
import { getDashboardLinks } from '@/lib/shortener/get-dashboard-links';
import { createClient } from '@/lib/supabase/server';
import { tKeys } from '@/localization/tKeys';

export default async function DashboardPage() {
  const t = await getTranslations();
  const supabase = await createClient();
  const links = await getDashboardLinks(supabase);

  return (
    <Flex direction="column" minH="100vh">
      <SiteHeader />

      <Container flex="1" maxW="3xl" pb="12">
        <HStack
          justify="space-between"
          align="flex-start"
          mb="4"
          gap="4"
          wrap="wrap"
        >
          <Heading fontFamily="mono" fontSize="lg">
            {t(tKeys.shortener.pages.dashboard.heading)}
          </Heading>
          <ExportLinksButton />
        </HStack>

        <Flex mb="6">
          <BrowserWarningBanner />
        </Flex>

        <LinkList links={links} />
      </Container>
    </Flex>
  );
}
