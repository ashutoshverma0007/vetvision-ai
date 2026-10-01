import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  variant?: 'button' | 'dropdown';
}

export function ThemeToggle({ showLabel = false, className = '', variant = 'button' }: ThemeToggleProps) {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'dropdown') {
    return (
      <div className={`relative inline-block ${className}`} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-all duration-200 text-xs font-medium shadow-sm"
          aria-label="Select color theme"
          title="Select theme"
        >
          {theme === 'light' && <Sun className="h-4 w-4 text-amber-500 animate-in spin-in-180 duration-300" />}
          {theme === 'dark' && <Moon className="h-4 w-4 text-indigo-400 animate-in spin-in-180 duration-300" />}
          {theme === 'system' && <Monitor className="h-4 w-4 text-emerald-500 animate-in spin-in-180 duration-300" />}
          <span className="capitalize">{theme} Theme</span>
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 rounded-xl border border-border bg-card p-1 shadow-lg shadow-black/10 z-50 animate-in fade-in zoom-in-95 duration-150">
            {(['light', 'dark', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t);
                  setDropdownOpen(false);
                }}
                className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  theme === t
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  {t === 'light' && <Sun className="h-3.5 w-3.5 text-amber-500" />}
                  {t === 'dark' && <Moon className="h-3.5 w-3.5 text-indigo-400" />}
                  {t === 'system' && <Monitor className="h-3.5 w-3.5 text-emerald-500" />}
                  <span className="capitalize">{t}</span>
                </div>
                {theme === t && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Quick toggle button variant
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center h-9 w-9 rounded-xl border border-border/80 bg-background/80 hover:bg-muted/80 text-foreground transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm group ${className}`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Current: ${theme} theme. Click to switch to ${isDark ? 'light' : 'dark'} mode.`}
    >
      <div className="relative h-4 w-4 flex items-center justify-center">
        <Sun
          className={`h-4 w-4 text-amber-500 transition-all duration-500 absolute ${
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
          }`}
        />
        <Moon
          className={`h-4 w-4 text-indigo-400 transition-all duration-500 absolute ${
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'
          }`}
        />
      </div>
      {showLabel && (
        <span className="ml-2 text-xs font-medium">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  );
}
