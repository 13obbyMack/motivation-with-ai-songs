'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingText,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = `
      inline-flex items-center justify-center gap-2
      font-medium rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      active:scale-95
      ${fullWidth ? 'w-full' : ''}
    `;

    const variantClasses = {
      primary: `
        bg-primary text-primary-foreground
        hover:bg-primary/90
        focus:ring-primary
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-secondary text-secondary-foreground
        hover:bg-secondary/80
        focus:ring-secondary
        border border-border
      `,
      destructive: `
        bg-destructive text-destructive-foreground
        hover:bg-destructive/90
        focus:ring-destructive
        shadow-sm hover:shadow-md
      `,
      outline: `
        border border-border bg-background
        text-foreground hover:bg-accent hover:text-accent-foreground
        focus:ring-ring
      `,
      ghost: `
        text-foreground hover:bg-accent hover:text-accent-foreground
        focus:ring-ring
      `,
      success: `
        bg-success text-success-foreground
        hover:bg-success/90
        focus:ring-success
        shadow-sm hover:shadow-md
      `,
      warning: `
        bg-warning text-warning-foreground
        hover:bg-warning/90
        focus:ring-warning
        shadow-sm hover:shadow-md
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-sm h-10',
      lg: 'px-6 py-2.5 text-base h-11',
      xl: 'px-8 py-3 text-lg h-12',
    };

    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <div
            className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"
            aria-hidden="true"
          />
        )}
        
        {!isLoading && leftIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        <span className={isLoading && !loadingText ? 'sr-only' : ''}>
          {isLoading && loadingText ? loadingText : children}
        </span>
        
        {!isLoading && rightIcon && (
          <span className="flex-shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;