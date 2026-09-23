import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: ['display', 'h1', 'h2', 'h3', 'body-l', 'body-m', 'body-s', 'label', 'caption'],
        },
      ],
      'font-family': [
        {
          font: ['inter-regular', 'inter-medium', 'inter-semibold', 'inter-bold'],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
