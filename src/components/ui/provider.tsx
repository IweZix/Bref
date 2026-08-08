'use client';

import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { ChakraCacheProvider } from './chakra-cache';
import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraCacheProvider>
      <ChakraProvider value={defaultSystem}>
        <ColorModeProvider {...props} />
      </ChakraProvider>
    </ChakraCacheProvider>
  );
}
