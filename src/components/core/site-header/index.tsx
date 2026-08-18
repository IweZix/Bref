'use client';

import { Link as ChakraLink, Flex, HStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { LoginButton } from '@/components/account/login-button';
import { LogoutButton } from '@/components/account/logout-button';
import { ColorModeButton } from '@/components/ui/color-mode';
import { Link } from '@/localization/navigation';

/**
 * Shared across every regular page (see the pages that render it). Optional
 * children slot for page-specific extra nav items (only the homepage's
 * "dashboard" link uses it). LoginButton/LogoutButton are mutually
 * exclusive by construction (opposite is_anonymous checks).
 */
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
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
      <HStack gap="4">
        {children}
        <LoginButton />
        <LogoutButton />
        <ColorModeButton />
      </HStack>
    </Flex>
  );
}
