'use client';

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';
import { useRouter } from '@/localization/navigation';
import { tKeys } from '@/localization/tKeys';

type Translator = ReturnType<typeof useTranslations>;

async function deleteLink(id: string, t: Translator): Promise<void> {
  const response = await fetch(`/api/links/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? t(tKeys.common.errors.generic));
  }
}

export function DeleteLinkButton({
  linkId,
  isCustomSlug,
}: {
  linkId: string;
  isCustomSlug: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: () => deleteLink(linkId, t),
    onSuccess: () => {
      router.push('/dashboard');
    },
    onError: (error: Error) => {
      toaster.create({ description: error.message, type: 'error' });
    },
  });

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => setOpen(e.open)}
      role="alertdialog"
    >
      <Dialog.Trigger asChild>
        <Button variant="ghost" colorPalette="red" fontFamily="mono" size="xs">
          {t(tKeys.shortener.deleteLinkButton.trigger)}
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content fontFamily="mono">
            <Dialog.Header>
              <Dialog.Title>
                {t(tKeys.shortener.deleteLinkButton.dialogTitle)}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">
                {isCustomSlug
                  ? t(tKeys.shortener.deleteLinkButton.dialogBodyCustomSlug)
                  : t(tKeys.shortener.deleteLinkButton.dialogBodyDefault)}
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" fontFamily="mono">
                  {t(tKeys.shortener.deleteLinkButton.cancel)}
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                fontFamily="mono"
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {t(tKeys.shortener.deleteLinkButton.confirm)}
              </Button>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
