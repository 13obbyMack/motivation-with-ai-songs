'use client';

import React from 'react';
import { useApp } from '@/contexts/AppContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  showLabel = false 
}) => {
  const { theme, setTheme } = useApp();
  const [resolvedTheme, setResolvedTheme] = React.useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = React.useState(false);
  
  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Calculate and track resolved theme for system preference
  React.useEffect(() => {
    if (!mounted) return;
    
    const updateResolvedTheme = () => {
      if (theme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(systemPrefersDark ? 'dark' : 'light');
      } else {
        setResolvedTheme(theme as 'light' | 'dark');
      }
    };

    updateResolvedTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateResolvedTheme);
      return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    }
    return undefined;
  }, [theme, mounted]);

  const handleToggle = () => {
    if (theme === 'system') {
      // If currently system, switch to opposite of resolved theme
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
    } else {
      // If currently light/dark, switch to opposite
      setTheme(theme === 'light' ? 'dark' : 'light');
    }
  };

  const getIcon = () => {
    if (!mounted) return '🌓'; // Default icon during SSR
    if (theme === 'system') {
      return '🌓'; // Half moon for system
    }
    return resolvedTheme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (!mounted) return 'System'; // Default label during SSR
    if (theme === 'system') {
      return `System (${resolvedTheme})`;
    }
    return theme === 'light' ? 'Light' : 'Dark';
  };

  // Don't render interactive elements until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="
          relative inline-flex items-center justify-center
          w-10 h-10 rounded-lg
          bg-secondary
          border border-border
        ">
          <span className="text-lg" role="img" aria-hidden="true">
            🌓
          </span>
        </div>
        {showLabel && (
          <span className="text-sm text-muted-foreground font-medium">
            System
          </span>
        )}
        <div className="
          ml-1 w-6 h-6 rounded-md
          bg-secondary
          border border-border
          flex items-center justify-center
          text-xs text-muted-foreground
        ">
          ⚙️
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="
          relative inline-flex items-center justify-center
          w-10 h-10 rounded-lg
          bg-secondary hover:bg-accent
          border border-border
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          active:scale-95
        "
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
        title={`Current theme: ${getLabel()}`}
      >
        <span className="text-lg" role="img" aria-hidden="true">
          {getIcon()}
        </span>
      </button>
      
      {showLabel && (
        <span className="text-sm text-muted-foreground font-medium">
          {getLabel()}
        </span>
      )}
      
      {/* Dropdown for advanced theme selection */}
      <div className="relative group">
        <button
          type="button"
          className="
            ml-1 w-6 h-6 rounded-md
            bg-secondary hover:bg-accent
            border border-border
            flex items-center justify-center
            text-xs text-muted-foreground
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
          "
          aria-label="Theme options"
          title="Theme options"
        >
          ⚙️
        </button>
        
        <div className="
          absolute right-0 top-full mt-1
          bg-popover border border-border rounded-lg shadow-lg
          min-w-32 py-1
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-200
          z-50
        ">
          {(['light', 'dark', 'system'] as const).map((themeOption) => (
            <button
              type="button"
              key={themeOption}
              onClick={() => setTheme(themeOption)}
              className={`
                w-full px-3 py-2 text-left text-sm
                hover:bg-accent
                transition-colors duration-150
                flex items-center gap-2
                ${theme === themeOption ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'}
              `}
            >
              <span role="img" aria-hidden="true">
                {themeOption === 'light' ? '☀️' : themeOption === 'dark' ? '🌙' : '🌓'}
              </span>
              <span className="capitalize">{themeOption}</span>
              {theme === themeOption && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ThemeToggle;