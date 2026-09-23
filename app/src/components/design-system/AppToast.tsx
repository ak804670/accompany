import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/design-system/AppText';
import { cn } from '@/lib/utils';
import { spacing } from '@/theme';

type ToastTone = 'default' | 'success' | 'warning' | 'error';

type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

const listeners = new Set<(toasts: ToastMessage[]) => void>();
let toasts: ToastMessage[] = [];
let nextId = 0;

function emit() {
  const snapshot = toasts;
  listeners.forEach((listener) => listener(snapshot));
}

export function showToast({ title, description, tone = 'default' }: ToastInput) {
  const id = nextId + 1;
  nextId = id;
  const message: ToastMessage = { id, title, description, tone };
  toasts = [...toasts, message].slice(-3);
  emit();

  setTimeout(() => {
    toasts = toasts.filter((item) => item.id !== id);
    emit();
  }, 3000);
}

const toneClassName: Record<ToastTone, string> = {
  default: 'border-border bg-card',
  success: 'border-transparent bg-success',
  warning: 'border-transparent bg-warning',
  error: 'border-transparent bg-destructive',
};

export function AppToastHost() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastMessage[]>(() => toasts);

  useEffect(() => {
    listeners.add(setItems);

    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 gap-sm px-md"
      style={{ top: insets.top + spacing[8] }}>
      {items.map((item) => {
        const labelClassName =
          item.tone === 'success' || item.tone === 'error' ? 'text-primary-foreground' : undefined;

        return (
          <View
            key={item.id}
            className={cn('gap-xs rounded-md border px-md py-sm', toneClassName[item.tone])}>
            <AppText variant="label" className={labelClassName}>
              {item.title}
            </AppText>
            {item.description ? (
              <AppText variant="bodyS" className={labelClassName}>
                {item.description}
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
