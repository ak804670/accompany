import { useState, useSyncExternalStore } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { Star, X } from 'lucide-react-native';

import { AppButton } from '@/components/design-system/AppButton';
import { AppText } from '@/components/design-system/AppText';
import { showToast } from '@/components/design-system/AppToast';
import { PersonAvatar } from '@/components/home/PersonAvatar';
import { callManager, type PendingRating } from '@/features/calls/call-manager';
import { ratingService } from '@/features/ratings/rating.service';

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent!',
};

function usePendingRating(): PendingRating | null {
  return useSyncExternalStore(
    (listener) => callManager.subscribe(listener),
    () => callManager.getPendingRating(),
  );
}

type CallRatingDialogProps = {
  pending?: PendingRating | null;
  onClose?: () => void;
  onSubmitSuccess?: () => void;
};

export function CallRatingDialog({
  pending: propPending,
  onClose,
  onSubmitSuccess,
}: CallRatingDialogProps = {}) {
  const storePending = usePendingRating();
  const pending = propPending !== undefined ? propPending : storePending;
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!pending) {
    return null;
  }

  const dismiss = () => {
    callManager.clearPendingRating();
    onClose?.();
    setRating(5);
    setComment('');
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    dismiss();
  };

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Please select a star rating between 1 and 5.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await ratingService.create({
        ratedUserId: pending.userId,
        callId: pending.callId,
        rating,
        comment: comment.trim() || undefined,
      });

      showToast({
        title: 'Rating submitted!',
        description: 'Thank you for helping our community with suggestions.',
        tone: 'success',
      });

      onSubmitSuccess?.();
      dismiss();
    } catch {
      setError('Could not submit rating. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-black/80 p-lg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="w-full max-w-sm"
      >
        <View className="relative overflow-hidden rounded-2xl border border-border bg-card p-xl shadow-2xl">
          {/* Close button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
            onPress={handleClose}
            hitSlop={12}
            className="absolute right-4 top-4 z-10 rounded-full p-1 active:bg-muted"
          >
            <X size={20} color="#9CA3AF" />
          </Pressable>

          {/* User info */}
          <View className="items-center gap-sm">
            <PersonAvatar userId={pending.userId} name={pending.name} size={72} />
            <AppText variant="h2" className="text-center font-bold">
              Rate your call
            </AppText>
            <AppText variant="bodyS" tone="muted" className="text-center">
              How was your conversation with <AppText variant="bodyS" className="font-semibold text-foreground">{pending.name}</AppText>?
            </AppText>
          </View>

          {/* Interactive Stars */}
          <View className="my-md items-center gap-xs">
            <View className="flex-row items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = star <= rating;
                return (
                  <Pressable
                    key={star}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                    onPress={() => setRating(star)}
                    className="p-1 active:scale-125"
                  >
                    <Star
                      size={36}
                      color={filled ? '#F59E0B' : '#6B7280'}
                      fill={filled ? '#F59E0B' : 'transparent'}
                    />
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="label" className="h-5 text-amber-500 font-medium">
              {RATING_LABELS[rating] ?? ''}
            </AppText>
          </View>

          {/* Comment / Suggestion Input */}
          <View className="gap-xs">
            <AppText variant="caption" tone="muted">
              Add a comment or suggestion (optional)
            </AppText>
            <TextInput
              accessibilityLabel="Feedback comments"
              placeholder="What went well or what could be improved?"
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={setComment}
              maxLength={500}
              multiline
              numberOfLines={3}
              className="min-h-[80px] rounded-xl border border-input bg-background/50 p-md text-foreground"
              textAlignVertical="top"
            />
          </View>

          {error ? (
            <AppText variant="caption" tone="error" className="mt-xs">
              {error}
            </AppText>
          ) : null}

          {/* Actions */}
          <View className="mt-lg gap-sm">
            <AppButton
              variant="primary"
              loading={submitting}
              onPress={() => void handleSubmit()}
            >
              Submit Rating
            </AppButton>
            <AppButton
              variant="ghost"
              disabled={submitting}
              onPress={handleClose}
            >
              Skip for now
            </AppButton>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
