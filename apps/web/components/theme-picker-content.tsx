'use client';

import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import * as React from 'react';

import { Button } from '@repo/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/popover';
import { cn } from '@repo/ui/lib/utils';

import {
  THEME_STYLES,
  type ThemeStyleDefinition,
} from '../lib/theme-style-definitions';
import type { ThemeStyle } from '../lib/theme-styles';
import { useThemeStyle } from './theme-style-provider';

type ColorMode = 'light' | 'dark' | 'system';

const COLOR_MODES: {
  id: ColorMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

function ThemePreviewCard({
  styleId,
  label,
  description,
  preview,
  isActive,
  onSelect,
}: {
  styleId: ThemeStyle;
  label: string;
  description: string;
  preview: ThemeStyleDefinition['preview'];
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={cn(
        'group relative flex flex-col gap-2 rounded-xl border p-2.5 text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isActive
          ? 'border-primary bg-accent/50 ring-1 ring-primary/30'
          : 'border-border bg-background/60',
      )}
    >
      <div
        className="relative h-16 w-full overflow-hidden rounded-lg border p-2"
        style={{
          background: preview.bg,
          borderColor: preview.border,
          borderRadius: preview.radius,
          boxShadow: preview.shadow,
        }}
      >
        <div
          className="mb-1.5 h-2 w-8 rounded-sm"
          style={{ background: preview.accent }}
        />
        <div
          className="h-7 rounded-sm border p-1"
          style={{
            background: preview.card,
            borderColor: preview.border,
            borderRadius: preview.radius,
            boxShadow: styleId === 'neumorphic' ? preview.shadow : undefined,
          }}
        >
          <div
            className="h-1 w-10 rounded-full"
            style={{ background: preview.text, opacity: 0.7 }}
          />
          <div
            className="mt-1 h-1 w-6 rounded-full"
            style={{ background: preview.text, opacity: 0.35 }}
          />
        </div>
        {styleId === 'glass' && (
          <div
            className="pointer-events-none absolute inset-0 backdrop-blur-[2px]"
            aria-hidden
          />
        )}
      </div>

      <div className="min-w-0 px-0.5">
        <div className="flex items-center justify-between gap-1">
          <p className="truncate text-sm font-medium">{label}</p>
          {isActive && (
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

type ThemePickerContentProps = {
  defaultOpen?: boolean;
  openSignal?: number;
};

export function ThemePickerContent({
  defaultOpen = false,
  openSignal = 0,
}: ThemePickerContentProps) {
  const { style, setStyle } = useThemeStyle();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (openSignal > 0) {
      setOpen(true);
    }
  }, [openSignal]);

  const activeColorMode: ColorMode =
    theme === 'light' || theme === 'dark' ? theme : 'system';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open theme picker">
          <Palette className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="space-y-4 p-4">
          <div>
            <p className="text-sm font-semibold">Appearance</p>
            <p className="text-xs text-muted-foreground">
              Choose a design style and color mode
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {THEME_STYLES.map((themeStyle) => (
              <ThemePreviewCard
                key={themeStyle.id}
                styleId={themeStyle.id}
                label={themeStyle.label}
                description={themeStyle.description}
                preview={themeStyle.preview}
                isActive={style === themeStyle.id}
                onSelect={() => setStyle(themeStyle.id)}
              />
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Color mode
            </p>
            <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1">
              {COLOR_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = activeColorMode === mode.id;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setTheme(mode.id)}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {mode.label}
                  </button>
                );
              })}
            </div>
            {activeColorMode === 'system' && resolvedTheme && (
              <p className="text-center text-[11px] text-muted-foreground">
                Currently using {resolvedTheme} mode
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
