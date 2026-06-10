'use client';

import { Palette } from 'lucide-react';
import * as React from 'react';

import { Button } from '@repo/ui/button';

type ThemePickerModule = typeof import('./theme-picker-content');

export function ThemeToggle() {
  const pickerModuleRef = React.useRef<Promise<ThemePickerModule> | null>(null);
  const [PickerContent, setPickerContent] = React.useState<
    ThemePickerModule['ThemePickerContent'] | null
  >(null);
  const [defaultOpen, setDefaultOpen] = React.useState(false);
  const [openSignal, setOpenSignal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);

  const loadPicker = React.useCallback(
    (openOnLoad = false) => {
      if (PickerContent) {
        if (openOnLoad) {
          setOpenSignal((count) => count + 1);
        }
        return;
      }

      if (openOnLoad) {
        setDefaultOpen(true);
      }

      if (!pickerModuleRef.current) {
        setIsLoading(true);
        pickerModuleRef.current = import('./theme-picker-content');
      }

      pickerModuleRef.current
        .then((module) => {
          setPickerContent(() => module.ThemePickerContent);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [PickerContent],
  );

  if (PickerContent) {
    return (
      <PickerContent defaultOpen={defaultOpen} openSignal={openSignal} />
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Open theme picker"
      aria-busy={isLoading}
      onPointerEnter={() => loadPicker()}
      onFocus={() => loadPicker()}
      onClick={() => loadPicker(true)}
    >
      <Palette className="h-5 w-5" />
    </Button>
  );
}
