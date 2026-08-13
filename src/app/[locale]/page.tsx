import {
  Box,
  Link as ChakraLink,
  Container,
  Flex,
  Heading,
  Text,
} from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import { LinkCreateForm } from '@/components/shortener/link-create-form';
import { ColorModeButton } from '@/components/ui/color-mode';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default function Home() {
  const t = useTranslations();
  return (
    <Flex direction="column" minH="100vh">
      <Flex
        as="header"
        justify="space-between"
        align="center"
        px={{ base: 4, md: 8 }}
        py="5"
      >
        <Heading fontFamily="mono" fontWeight="bold" fontSize="xl">
          bref.
        </Heading>
        <Flex align="center" gap="4">
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
          <ColorModeButton />
        </Flex>
      </Flex>

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
