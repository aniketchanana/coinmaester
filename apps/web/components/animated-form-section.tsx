import { cn } from '@repo/ui/lib/utils';

import { staggerDelay } from '../lib/motion';

interface AnimatedFormSectionProps {
  index: number;
  children: React.ReactNode;
  className?: string;
}

export function AnimatedFormSection({
  index,
  children,
  className,
}: AnimatedFormSectionProps) {
  return (
    <div
      className={cn(
        'animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 motion-reduce:animate-none',
        className,
      )}
      style={staggerDelay(index)}
    >
      {children}
    </div>
  );
}
