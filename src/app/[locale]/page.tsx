import {
  Box,
  Link as ChakraLink,
  Container,
  Flex,
  Text,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { SiteHeader } from '@/components/core/site-header';
import { LinkCreateForm } from '@/components/shortener/link-create-form';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default function Home() {
  const t = useTranslations();
  return (
    <Flex direction="column" minH="100vh">
      <SiteHeader>
        <ChakraLink
          asChild
          fontFamily="mono"
          fontSize="sm"
          color="fg.muted"
          _hover={{ color: 'brand.fg' }}
        >
          <Link href="/dashboard">
            {t(tKeys.shortener.pages.home.dashboardLink)}
          </Link>
        </ChakraLink>
      </SiteHeader>

      <Container flex="1" display="flex" alignItems="center" maxW="2xl">
        <Box w="full">
          <LinkCreateForm />
        </Box>
      </Container>

      <Box
        as="footer"
        textAlign="center"
        py="6"
        fontFamily="mono"
        fontSize="xs"
        color="fg.subtle"
      >
        <Text>{`// ${t(tKeys.shortener.pages.home.footerTrustCopy)}`}</Text>
      </Box>
    </Flex>
  );
}
