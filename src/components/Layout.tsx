'use client';

import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  showHeader = true,
  showFooter = true,
  maxWidth = 'xl',
  className = '',
}) => {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8`}>
            <div className="flex h-16 items-center justify-between">
              {/* Logo/Title */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg" role="img" aria-label="Music note">
                      🎵
                    </span>
                  </div>
                  <div className="hidden sm:block">
                    <h1 className="text-lg font-semibold text-foreground">
                      AI Motivation Song Generator
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Personalized motivational songs
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation/Actions */}
              <div className="flex items-center space-x-4">
                <nav className="hidden md:flex items-center space-x-6">
                  <a
                    href="#features"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Features
                  </a>
                  <a
                    href="#how-it-works"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    How it Works
                  </a>
                  <a
                    href="#support"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Support
                  </a>
                </nav>
                
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${className}`}>
        <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12`}>
          {children}
        </div>
      </main>

      {/* Footer */}
      {showFooter && (
        <footer className="border-t border-border bg-muted/50">
          <div className={`${maxWidthClasses[maxWidth]} mx-auto px-4 sm:px-6 lg:px-8 py-8`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* About */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  About
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create personalized motivational songs using AI-powered speech generation 
                  and your favorite music tracks.
                </p>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Features
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• AI-generated motivational content</li>
                  <li>• Multiple speaker personalities</li>
                  <li>• YouTube music integration</li>
                  <li>• High-quality audio processing</li>
                </ul>
              </div>

              {/* Privacy & Security */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Privacy & Security
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• API keys stored locally</li>
                  <li>• No data persistence</li>
                  <li>• Secure processing</li>
                  <li>• GDPR compliant</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  © 2025 AI Motivation Song Generator. Built with Next.js and AI.
                </p>
                <div className="flex items-center space-x-4 mt-4 sm:mt-0">
                  <span className="text-xs text-muted-foreground">
                    Made with ❤️ for motivation
                  </span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export { Layout };
export default Layout;