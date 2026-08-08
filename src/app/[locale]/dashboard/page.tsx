import {
  Link as ChakraLink,
  Container,
  Flex,
  Heading,
  HStack,
} from '@chakra-ui/react';
import { BrowserWarningBanner } from '@/components/shortener/browser-warning-banner';
import { ExportLinksButton } from '@/components/shortener/export-links-button';
import { LinkList } from '@/components/shortener/link-list';
import { ColorModeButton } from '@/components/ui/color-mode';
import { getDashboardLinks } from '@/lib/shortener/get-dashboard-links';
import { createClient } from '@/lib/supabase/server';
import { Link } from '@/localization/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const links = await getDashboardLinks(supabase);

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
        <HStack
          justify="space-between"
          align="flex-start"
          mb="4"
          gap="4"
          wrap="wrap"
        >
          <Heading fontFamily="mono" fontSize="lg">
            tableau de bord
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
