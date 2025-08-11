'use client';

import { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove any existing theme classes/attributes
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
    
    const applyTheme = () => {
      if (theme === 'system') {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
          root.setAttribute('data-theme', 'dark');
          root.classList.add('dark');
        } else {
          root.removeAttribute('data-theme');
          root.classList.remove('dark');
        }
      } else if (theme === 'dark') {
        root.setAttribute('data-theme', 'dark');
        root.classList.add('dark');
      } else {
        root.removeAttribute('data-theme');
        root.classList.remove('dark');
      }
    };

    // Apply theme immediately
    applyTheme();

    // Listen for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
    
    // Return empty cleanup function for non-system themes
    return () => {};
  }, [theme]);

  return <>{children}</>;
}