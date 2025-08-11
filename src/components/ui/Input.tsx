'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error' | 'success';
  inputSize?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  error?: string;
  helperText?: string;
  label?: string;
  required?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    className = '',
    variant = 'default',
    inputSize = 'md',
    leftIcon,
    rightIcon,
    isLoading = false,
    error,
    helperText,
    label,
    required = false,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;

    const baseClasses = `
      w-full rounded-lg border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-muted-foreground
    `;

    const variantClasses = {
      default: `
        border-form-border bg-form-bg text-foreground
        focus:border-form-focus focus:ring-form-focus/20
      `,
      error: `
        border-form-error bg-form-bg text-foreground
        focus:border-form-error focus:ring-form-error/20
      `,
      success: `
        border-form-success bg-form-bg text-foreground
        focus:border-form-success focus:ring-form-success/20
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-3 py-2 text-sm h-10',
      lg: 'px-4 py-2.5 text-base h-11',
    };

    const currentVariant = error ? 'error' : variant;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseClasses}
              ${variantClasses[currentVariant]}
              ${sizeClasses[inputSize]}
              ${leftIcon ? 'pl-10' : ''}
              ${rightIcon || isLoading ? 'pr-10' : ''}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={[errorId, helperTextId].filter(Boolean).join(' ') || undefined}
            required={required}
            {...props}
          />

          {/* Right icon or loading spinner */}
          {(rightIcon || isLoading) && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              {isLoading ? (
                <div
                  className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                  aria-hidden="true"
                />
              ) : (
                rightIcon
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="mt-1 text-sm text-form-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={helperTextId}
            className="mt-1 text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export default Input;