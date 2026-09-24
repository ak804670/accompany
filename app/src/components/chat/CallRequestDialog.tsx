import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AppButton } from '@/components/design-system/AppButton';

type CallKind = 'voice' | 'video';

type CallRequestDialogProps = {
  kind: CallKind | null;
  name: string;
  onClose: () => void;
};

export function CallRequestDialog({ kind, name, onClose }: CallRequestDialogProps) {
  const label = kind === 'video' ? 'video' : 'voice';

  return (
    <Dialog open={kind !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a {label} call?</DialogTitle>
          <DialogDescription>
            Confirm that you want to request a {label} call with {name}.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <AppButton variant="outline" onPress={onClose}>Not now</AppButton>
          <AppButton onPress={onClose}>Request</AppButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
