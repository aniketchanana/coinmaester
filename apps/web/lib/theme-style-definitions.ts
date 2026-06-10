import type { ThemeStyle } from './theme-styles';

export type ThemeStylePreview = {
  bg: string;
  card: string;
  accent: string;
  text: string;
  border: string;
  shadow: string;
  radius: string;
};

export type ThemeStyleDefinition = {
  id: ThemeStyle;
  label: string;
  description: string;
  preview: ThemeStylePreview;
};

export const THEME_STYLES: ThemeStyleDefinition[] = [
  {
    id: 'default',
    label: 'ShadCN',
    description: 'Clean, modern defaults',
    preview: {
      bg: 'hsl(0 0% 98%)',
      card: 'hsl(0 0% 100%)',
      accent: 'hsl(240 6% 10%)',
      text: 'hsl(240 10% 4%)',
      border: 'hsl(240 6% 90%)',
      shadow: '0 1px 3px rgb(0 0 0 / 0.1)',
      radius: '0.5rem',
    },
  },
  {
    id: 'neumorphic',
    label: 'Neumorphic',
    description: 'Soft extruded surfaces',
    preview: {
      bg: 'hsl(220 14% 90%)',
      card: 'hsl(220 14% 90%)',
      accent: 'hsl(220 20% 40%)',
      text: 'hsl(220 15% 25%)',
      border: 'transparent',
      shadow: '4px 4px 8px hsl(220 15% 70%), -4px -4px 8px hsl(0 0% 100%)',
      radius: '0.75rem',
    },
  },
  {
    id: 'glass',
    label: 'Glassmorphic',
    description: 'Frosted translucent layers',
    preview: {
      bg: 'linear-gradient(135deg, hsl(230 80% 72%), hsl(280 55% 75%))',
      card: 'hsl(0 0% 100% / 0.55)',
      accent: 'hsl(250 70% 58%)',
      text: 'hsl(230 25% 15%)',
      border: 'hsl(0 0% 100% / 0.35)',
      shadow: '0 4px 16px hsl(250 60% 50% / 0.15)',
      radius: '0.75rem',
    },
  },
  {
    id: 'brutalist',
    label: 'Neo-Brutalist',
    description: 'Bold borders & hard shadows',
    preview: {
      bg: 'hsl(48 100% 96%)',
      card: 'hsl(48 100% 98%)',
      accent: 'hsl(270 80% 55%)',
      text: 'hsl(0 0% 5%)',
      border: 'hsl(0 0% 5%)',
      shadow: '3px 3px 0 hsl(0 0% 5%)',
      radius: '0.125rem',
    },
  },
];
