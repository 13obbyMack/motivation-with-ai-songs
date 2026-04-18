'use client';

// Theme application is handled by AppContext.
// This component exists as a structural wrapper for future extensibility.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
