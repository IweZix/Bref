'use client';

import { ChakraProvider } from '@chakra-ui/react';
import { system } from '@/theme/system';
import { ChakraCacheProvider } from './chakra-cache';
import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraCacheProvider>
      <ChakraProvider value={system}>
        <ColorModeProvider {...props} />
      </ChakraProvider>
    </ChakraCacheProvider>
  );
}
