import {
  Link as ChakraLink,
  Container,
  Flex,
  Heading,
  Stack,
} from '@chakra-ui/react';
import { getTranslations } from 'next-intl/server';
import { AccountEmailForm } from '@/components/account/account-email-form';
import { ColorModeButton } from '@/components/ui/color-mode';
import { Link } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

export default async function AccountPage() {
  const t = await getTranslations();

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

      <Container flex="1" maxW="xl" pb="12">
        <Stack gap="4">
          <Heading fontFamily="mono" fontSize="lg">
            {t(tKeys.shortener.pages.account.heading)}
          </Heading>
          <AccountEmailForm />
        </Stack>
      </Container>
    </Flex>
  );
}
