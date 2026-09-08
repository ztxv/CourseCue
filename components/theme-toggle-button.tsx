'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Theme = 'light' | 'dark';

export function ThemeToggleButton({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const dark = theme === 'dark';

  return (
    <Button
      className="theme-toggle-button"
      variant="outline"
      size="icon-lg"
      type="button"
      onClick={onToggle}
      aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`}
      aria-pressed={dark}
      title={`Switch to ${dark ? 'light' : 'dark'} mode`}
    >
      <Sun className={`theme-icon theme-icon-sun ${dark ? 'is-hidden' : 'is-visible'}`} aria-hidden="true" />
      <Moon className={`theme-icon theme-icon-moon ${dark ? 'is-visible' : 'is-hidden'}`} aria-hidden="true" />
      <span className="sr-only">Toggle color theme</span>
    </Button>
  );
}
