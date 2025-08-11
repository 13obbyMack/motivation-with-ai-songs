'use client';

import React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  showValue?: boolean;
  isIndeterminate?: boolean;
  label?: string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    className = '',
    value = 0,
    max = 100,
    size = 'md',
    variant = 'default',
    showValue = false,
    isIndeterminate = false,
    label,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    };

    const variantClasses = {
      default: 'bg-progress-fill',
      success: 'bg-success',
      warning: 'bg-warning',
      destructive: 'bg-destructive',
    };

    return (
      <div
        ref={ref}
        className={`w-full ${className}`}
        {...props}
      >
        {/* Label and value display */}
        {(label || showValue) && (
          <div className="flex justify-between items-center mb-2">
            {label && (
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            )}
            {showValue && !isIndeterminate && (
              <span className="text-sm text-muted-foreground">
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        )}

        {/* Progress bar container */}
        <div
          className={`
            relative overflow-hidden
            bg-progress-bg rounded-full
            ${sizeClasses[size]}
          `}
          role="progressbar"
          aria-valuenow={isIndeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label || 'Progress'}
        >
          {/* Progress bar fill */}
          <div
            className={`
              h-full rounded-full transition-all duration-300 ease-out
              ${variantClasses[variant]}
              ${isIndeterminate ? 'progress-indeterminate' : ''}
            `}
            style={{
              width: isIndeterminate ? '100%' : `${percentage}%`,
              transform: isIndeterminate ? 'translateX(-100%)' : 'none',
            }}
          />
        </div>

        {/* Screen reader text for indeterminate progress */}
        {isIndeterminate && (
          <span className="sr-only">Loading...</span>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
export default Progress;