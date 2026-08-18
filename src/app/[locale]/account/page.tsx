import { Container, Flex, Heading, Stack } from '@chakra-ui/react';
import { getTranslations } from 'next-intl/server';
import { AccountEmailForm } from '@/components/account/account-email-form';
import { SiteHeader } from '@/components/core/site-header';
import { tKeys } from '@/localization/tKeys';

export default async function AccountPage() {
  const t = await getTranslations();

  return (
    <Flex direction="column" minH="100vh">
      <SiteHeader />

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
