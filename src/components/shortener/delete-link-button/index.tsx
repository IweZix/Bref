'use client';

import { Button, CloseButton, Dialog, Portal, Text } from '@chakra-ui/react';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { toaster } from '@/components/ui/toaster';
import { useRouter } from '@/localization/navigation';

async function deleteLink(id: string): Promise<void> {
  const response = await fetch(`/api/links/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Une erreur est survenue');
  }
}

export function DeleteLinkButton({
  linkId,
  isCustomSlug,
}: {
  linkId: string;
  isCustomSlug: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: () => deleteLink(linkId),
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
          Supprimer
        </Button>
      </Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content fontFamily="mono">
            <Dialog.Header>
              <Dialog.Title>Supprimer ce lien ?</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="fg.muted">
                {isCustomSlug
                  ? "Ce slug personnalisé sera retiré : personne d'autre ne pourra le reprendre, mais tu pourras le récupérer depuis cette session."
                  : 'Ce lien sera définitivement supprimé.'}
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline" fontFamily="mono">
                  Annuler
                </Button>
              </Dialog.ActionTrigger>
              <Button
                colorPalette="red"
                fontFamily="mono"
                loading={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                Supprimer
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
