/** Durations in milliseconds. Use these instead of one-off timings. */
export const motion = {
  micro: 120,
  standard: 220,
  emphasis: 320,
  transition: 420,
} as const;

export const motionEasing = {
  enter: 'cubic-bezier(0.2, 0, 0, 1)',
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  move: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/**
 * Micro: press, toggle, online dot, button loading.
 * Standard: sheets, message enter (opacity + 8px), coin count.
 * Emphasis: success check, small spring, no celebration.
 * Transition: discovery to profile, shared image, stack changes.
 */
export const motionUse = {
  press: motion.micro,
  messageEnter: motion.standard,
  messageOffset: 8,
  balance: motion.standard,
  success: motion.emphasis,
  screen: motion.transition,
} as const;
