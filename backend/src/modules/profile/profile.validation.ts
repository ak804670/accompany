import { z } from 'zod';

const displayName = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} .'’-]*$/u, 'Use a name without symbols.');

const dateOfBirth = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const basicsSchema = z.object({
  displayName,
  dateOfBirth,
});

export const profilePatchSchema = z
  .object({
    displayName: displayName.optional(),
    dateOfBirth: dateOfBirth.optional(),
    bio: z.string().trim().max(500).optional(),
    languagePreferences: z.array(z.string().trim().min(2).max(16)).max(8).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export const interestsSchema = z.object({
  interestIds: z.array(z.string().uuid()).max(12),
});

export function assertAdultDateOfBirth(value: string, today = new Date()): void {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error('invalid');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const real =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!real || year < 1900) {
    throw new Error('invalid');
  }
  const adult = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  if (date.getTime() > adult.getTime()) {
    throw new Error('age');
  }
}
