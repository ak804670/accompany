import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/design-system/AppText';
import { BrandIcon } from '@/components/icons/BrandIcon';
import { Icon } from '@/components/ui/icon';
import { presentCall, type CallFacts } from '@/features/calls/call-presentation';
import { cn } from '@/lib/utils';

export function CallEventRow({ call, viewerId, stacked = false }: { call: CallFacts; viewerId?: string; stacked?: boolean }) {
  const view = presentCall(call, viewerId);
  const tone = view.missed ? 'text-destructive' : 'text-muted-foreground';
  const label = view.duration ? `${view.title} · ${view.duration}` : view.title;
  return (
    <View accessibilityLabel={view.accessibilityLabel} className={stacked ? 'min-w-0 gap-0' : 'flex-row items-center gap-sm'}>
      <View className="min-w-0 flex-row items-center gap-sm">
        <View className="flex-row items-center">
          <Icon as={view.incoming ? ArrowDownLeft : ArrowUpRight} className={cn('size-3.5', tone)} />
          <BrandIcon name={view.video ? 'video-call' : 'call'} size={14} />
        </View>
        <AppText variant="bodyS" tone={view.missed ? 'error' : 'default'} numberOfLines={1} className="min-w-0 flex-1">{label}</AppText>
        {stacked ? null : <AppText variant="caption" tone="muted">{view.time}</AppText>}
      </View>
      {stacked ? <AppText variant="caption" tone="muted">{view.when}</AppText> : null}
    </View>
  );
}
