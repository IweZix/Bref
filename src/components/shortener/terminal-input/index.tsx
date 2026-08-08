'use client';

import { Input, InputGroup, type InputProps } from '@chakra-ui/react';
import { forwardRef } from 'react';

export const TerminalInput = forwardRef<HTMLInputElement, InputProps>(
  function TerminalInput(props, ref) {
    return (
      <InputGroup
        startElement="›"
        startElementProps={{ color: 'fg.muted', fontWeight: 'bold' }}
      >
        <Input
          ref={ref}
          fontFamily="mono"
          bg="app-bg"
          borderColor="app-border"
          borderRadius="md"
          _placeholder={{ color: 'fg.subtle' }}
          {...props}
        />
      </InputGroup>
    );
  },
);
